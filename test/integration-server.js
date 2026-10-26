// Isolated test process only. Production npm start never imports this file.
import {C} from '../config.js';
C.teamItems.plasma.price=C.testing.drillPrice;
C.resilience.leaveGraceSeconds=C.testing.leaveGraceSeconds;
await import('../server.js');
