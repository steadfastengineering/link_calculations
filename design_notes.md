# Assumptions

This is a top view. Theta is the angle between the link and the longitudinal frame line. The link is treated as horizontal, so it can only carry load along its own axis.

**P = F_lateral / sin(theta)**

At 0° the link runs with the frame and has no lateral component, so the load is undefined. A small angle is a large multiplier, because most of the link force is fore and aft. Length does not change that once the angle is known.

Dividing by 4 assumes all four links share the same angle and the same lateral load. Equal length does not create that share.

# Left out

- Side-view rise. A link that also climbs or drops is longer than this plan view, so the real axial load is higher than the calculator shows.
- Upper and lower pairs often have different angles, and a tire force at the contact patch adds a roll moment. One link in a pair is in tension and the other in compression.
- Vertical jacking. That comes from the side-view angle, which is not an input here.

The isolated value is one horizontal link taking the full lateral force. The quartered value is only a lower bound if all four links really share that same angle.
