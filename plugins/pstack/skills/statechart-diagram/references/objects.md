# Objects

Each object is drawn to fit the box the placer finds for it, so sizes below are natural sizes in mm at
`@1`; `@0.8` after an object scales it. An argument follows a colon.

| object | size | argument | good beside |
|---|---|---|---|
| `document` | 26 x 32 | a title; `signed:Title` adds a signature and a pen | a contract, an order, a form, anything signed or filed |
| `envelope` | 22 x 15 | – | a thing sent to someone |
| `stamp` | 26 x 12 | the word; `WORD\|#hex` picks the ink | an approval, a rejection, a verdict |
| `pencil` | 18 x 5 | – | a draft, an edit |
| `pen` | 20 x 6 | – | a signature, a review |
| `house` | 20 x 18 | – | a home, a project, a delivery |
| `bin` | 13 x 17 | – | a void, a deletion, a rejection |
| `clock` | 14 x 14 | `h:mm` | a deadline, a wait, a timeout |
| `coin` | 12 x 12 | the sign (`$` by default) | payment, a refund, money owed |
| `parcel` | 18 x 16 | a label | a shipment, stock, an order |
| `flag` | 14 x 20 | a word; `WORD\|#hex` picks the colour | a milestone, a release, a finish |
| `person` | 12 x 24 | `pose\|#shirt`, pose: stand, wave, hold, point | the customer, the staff, the reviewer |
| `check` | 6 x 6 | a colour | done, approved |
| `cross` | 6 x 6 | a colour | refused, voided |

Add your own in a scene module (see `scene-modules.md`), or in `scripts/lib/objects.mjs` with the same shape:
`{ w, h, draw(S, box, arg) }`, registered in `OBJECTS`.
