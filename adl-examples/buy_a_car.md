---
id: "buy_a_car"
tags:
- "cars"
examples:
- "Can you help me find a car to buy?"
- "I want to purchase a car. What are my options?"
- "I'm interested in buying a car. Can you assist me?"
- "Could you guide me through the car purchasing process?"
- "I need help finding the right car to buy."
- "Looking to buy a car within a certain budget. Can you help?"
- "Could you help me with buying a new car?"
- "Can you help me with the car buying process?"
- "Can you assist me with purchasing a car?"
- "I'm planning to buy a car and need some guidance."
- "Urgently need to buy a car. Can you advise me on this?"
- "I want to buy a car"
---

### UseCase: buy_a_car

#### Description
The customer wants to buy a car or is in the process of buying a car with us.

## Steps 
- ASK the customer how much they want to spend on the car. 
- ASK the customer if they would like to sell their current car. It is fine if the customer does not have a budget.

#### Solution

Thank the customer for their business.

If the customer has provided a budget greater than $100,000 call the @get_elite_car_deals() to get the best deals.

If the customer did not mention a budget or mentioned a low budget call the @get_car_deals() to get the best deals.


----