# Purpose

This is an abstract, top-down view of a single link attached to an axle and frame. Theta is the angle between the link and the longitudinal frame line. 

This is a simple static analysis tool to illustrate how change the angle of link triangulation can proportionally change the load that the link sees from laterall loads, that is those loads that attempt to shift the axle left or right beneath the vehicle. 

For a given lateral load, this computes the theoretical load along the axis of the link by the following proportion:

**F_link = F_lateral / sin(theta)**

At 0° the link runs with the frame and has no lateral component, so the load is undefined. A small angle (less triangulation) is a larger multiplier of lateral loads. 

Dividing by 4 assumes all four links share the same angle and the same lateral load. In reality, space and chassis limitations do not cause a perfect 4 way distribution of load.

# Left out

- Side-view rise. A link that also climbs or drops is longer than this plan view, so the real axial load is higher than the calculator shows.
- Upper and lower pairs often have different angles, and a tire force at the contact patch adds a roll moment. One link in a pair is in tension and the other in compression.
- Vertical jacking. That comes from the side-view angle, which is not an input here.

The isolated value is one horizontal link taking the full lateral force. The quartered value is only a lower bound if all four links really share that same angle.
