import { EventSourcePolyfill } from 'event-source-polyfill';

type EventCallback = (event: any) => void;

class EventService {
  private static instance: EventService;
  private eventSource: EventSourcePolyfill | null = null;
  private subscribers: EventCallback[] = [];

  private constructor() {
    if (typeof window === 'undefined') return;

    // Connect directly to the agent event stream
    this.eventSource = new EventSourcePolyfill('http://localhost:8080/events');

    this.eventSource.onmessage = (event) => {
      console.log('Received event:', event.data);
      if (event.data === 'heartbeat') {
        return;
      }
      try {
        const newEvent = JSON.parse(event.data);
        this.subscribers.forEach(callback => callback(newEvent));
      } catch (error) {
        console.log('Error on event:', error);
        // Ignore parsing errors for non-JSON messages like heartbeats
      }
    };

    this.eventSource.onerror = (err) => {
      if (this.eventSource) {
        this.eventSource.close();
      }
    };
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
}

export const eventService = EventService.getInstance();
