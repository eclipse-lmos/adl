import { EventSourcePolyfill } from 'event-source-polyfill';
import {
  buildOrganizationHeaders,
  getEventsUrl,
  readOrganizationAccess,
  subscribeToOrganizationAccess,
} from '@/lib/organization-access';

type EventCallback = (event: any) => void;

class EventService {
  private static instance: EventService;
  private eventSource: EventSourcePolyfill | null = null;
  private subscribers: EventCallback[] = [];

  private constructor() {
    if (typeof window === 'undefined') return;
    this.connect();
    subscribeToOrganizationAccess(() => this.connect());
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  public subscribe(callback: EventCallback) {
    this.subscribers.push(callback);
  }

  public unsubscribe(callback: EventCallback) {
    this.subscribers = this.subscribers.filter(cb => cb !== callback);
  }

  private connect() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
    }

    const accessState = readOrganizationAccess();
    this.eventSource = new EventSourcePolyfill(getEventsUrl(), {
      headers: buildOrganizationHeaders(accessState),
      withCredentials: true,
    });

    this.eventSource.onmessage = (event) => {
      if (event.data === 'heartbeat') {
        return;
      }
      try {
        const newEvent = JSON.parse(event.data);
        this.subscribers.forEach(callback => callback(newEvent));
      } catch (error) {
        console.log('Error on event:', error);
      }
    };

    this.eventSource.onerror = () => {
      if (this.eventSource) {
        this.eventSource.close();
      }
    };
  }
}

export const eventService = EventService.getInstance();
