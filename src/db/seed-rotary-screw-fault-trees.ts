import "./load-env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  equipment,
  faultTree,
  faultTreeBranch,
  faultTreeEquipment,
  faultTreeNode,
} from "@/db/schema";

type QuestionNode = { type: "question"; prompt: string };
type DiagnosisNode = {
  type: "diagnosis";
  prompt: string;
  probableCause: string;
  recommendedFix: string;
  safetyWarning?: string;
};
type NodeSpec = QuestionNode | DiagnosisNode;

type TreeSpec = {
  title: string;
  description: string;
  root: string;
  nodes: Record<string, NodeSpec>;
  edges: { from: string; label: string; to: string }[];
};

// Fault trees for oil-injected rotary screw, electrically-driven plant air
// compressors (fixed speed and VSD). Each tree assumes the reader has
// already isolated/locked out the unit before opening any panel or
// pressurized component, per the safety warnings on individual diagnoses.

const overloadTrip: TreeSpec = {
  title: "Compressor trips on motor overload / high current draw",
  description: "Start here when the motor overload relay or breaker trips.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Does the overload trip immediately at start, or after the compressor has been running for a while?" },
    q2: { type: "question", prompt: "With power isolated and locked out, does the airend shaft turn freely by hand?" },
    q3: { type: "question", prompt: "Has the unit been idle for an extended period, recently moved, or had nearby electrical work done?" },
    q4: { type: "question", prompt: "Is the overload/thermal relay or breaker trip setting at or below the motor nameplate full-load amps (FLA)?" },
    q5: { type: "question", prompt: "Is cooling airflow restricted (dirty coolers, failed fan, hot air recirculating)?" },
    q6: { type: "question", prompt: "Is the unit running above its rated discharge pressure?" },
    d1: {
      type: "diagnosis",
      prompt: "Seized or damaged airend",
      probableCause: "Airend rotors are seized or have internal damage, most often from liquid ingestion, a lubrication failure, or foreign object damage.",
      recommendedFix: "Do not force the shaft. Drain the sump and check for slugging, then have the airend inspected and overhauled or replaced by a qualified technician before any further start attempts.",
      safetyWarning: "Lock out/tag out and isolate all stored air pressure before touching internal components.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Motor insulation breakdown from moisture/idle time",
      probableCause: "Extended idle time, especially in humid conditions, lets motor windings absorb moisture, lowering insulation resistance and increasing starting current.",
      recommendedFix: "Megger-test the motor windings before restarting. Dry out the motor or have it reconditioned/rewound if insulation resistance is low.",
      safetyWarning: "Lock out/tag out before testing or working on motor terminals.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Overload relay set below motor FLA",
      probableCause: "The thermal overload or breaker trip class is set at or below the motor's actual full-load current rating, so it nuisance-trips under normal current.",
      recommendedFix: "Reset the overload relay to match the motor nameplate FLA and recommended trip class.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Voltage imbalance or low supply voltage",
      probableCause: "Unbalanced or low incoming three-phase voltage forces the motor to draw higher current to deliver the same power, tripping the overload.",
      recommendedFix: "Measure phase-to-phase voltage at the disconnect under load. Report imbalance over ~2% to the electrical supplier/site electrician and correct any loose connections.",
      safetyWarning: "Lock out/tag out before opening any electrical panel; use a meter rated for the voltage present.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Overheating from restricted cooling airflow",
      probableCause: "Blocked or fouled coolers, a failed cooling fan, or recirculating hot exhaust air raises operating temperature and motor load until it trips.",
      recommendedFix: "Clean the cooler fins and check fan operation. Ensure compressor room ventilation supplies clear inlet air and exhausts hot air away from the intake.",
    },
    d6: {
      type: "diagnosis",
      prompt: "Operating above rated discharge pressure",
      probableCause: "A pressure setpoint that has drifted upward, or a stuck check valve holding line pressure high, forces the airend to work harder than its rated pressure, increasing motor load.",
      recommendedFix: "Verify the working pressure setpoint against the rated maximum. Inspect the minimum pressure/check valve and correct any downstream restriction holding pressure high.",
    },
    d7: {
      type: "diagnosis",
      prompt: "Worn motor bearings or drive-train drag",
      probableCause: "Worn motor or airend bearings, a misaligned coupling, or an over-tight drive belt increase mechanical drag, raising current draw with no change in pressure or cooling.",
      recommendedFix: "Check motor bearing temperature and vibration. Inspect belt tension and coupling alignment per the OEM manual and correct or replace as needed.",
    },
  },
  edges: [
    { from: "q1", label: "Immediately at start", to: "q2" },
    { from: "q1", label: "After running for a while", to: "q5" },
    { from: "q2", label: "No, it's stiff or won't turn", to: "d1" },
    { from: "q2", label: "Yes, turns freely", to: "q3" },
    { from: "q3", label: "Yes", to: "d2" },
    { from: "q3", label: "No", to: "q4" },
    { from: "q4", label: "Yes, trip setting is too low", to: "d3" },
    { from: "q4", label: "No, setting looks correct", to: "d4" },
    { from: "q5", label: "Yes", to: "d5" },
    { from: "q5", label: "No", to: "q6" },
    { from: "q6", label: "Yes", to: "d6" },
    { from: "q6", label: "No", to: "d7" },
  ],
};

const lowPressure: TreeSpec = {
  title: "Won't build or reach discharge pressure",
  description: "Start here when the compressor runs loaded but pressure is low or falls quickly under demand.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Does the unit run loaded continuously and never reach setpoint, or reach setpoint and then drop quickly under load?" },
    q2: { type: "question", prompt: "Is the inlet (suction) valve opening fully when the compressor loads?" },
    q3: { type: "question", prompt: "Is the air filter element heavily fouled or overdue for service?" },
    q4: { type: "question", prompt: "Has the airend been in service a long time, or is there unusual internal noise suggesting rotor wear?" },
    q5: { type: "question", prompt: "Does pressure recover quickly once demand decreases, with no abnormal noise?" },
    d1: {
      type: "diagnosis",
      prompt: "Faulty inlet valve or actuator",
      probableCause: "The inlet valve isn't opening fully when the compressor loads, restricting the volume of air the airend can draw in and compress.",
      recommendedFix: "Inspect the inlet valve diaphragm/actuator and its control air or solenoid signal. Clean or replace the assembly if it's sticking or not stroking fully open.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Restricted intake air filter",
      probableCause: "A clogged intake filter starves the airend of inlet air, reducing the volume available to compress and lowering achievable output.",
      recommendedFix: "Replace the air filter element and check the housing/intake ducting for further restrictions.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Worn airend rotors or seals",
      probableCause: "Worn rotor clearances or damaged seals let compressed air leak back internally, reducing effective delivered volume even though the unit runs and loads normally.",
      recommendedFix: "Have the airend's volumetric efficiency checked by a qualified technician; an overhaul or airend exchange is typically required to restore output.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Demand exceeds compressor capacity",
      probableCause: "Downstream air demand (new equipment, leaks, or simultaneous heavy users) exceeds what this compressor is rated to deliver.",
      recommendedFix: "Run a leak survey and review total plant air demand against this unit's rated CFM. Consider leak repairs, load management, or additional capacity.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Pressure drop is demand/leak driven, not a compressor fault",
      probableCause: "The compressor is keeping up with average demand, but momentary high-demand events or leaks pull pressure down faster than the unit and receiver can replenish it.",
      recommendedFix: "Check receiver sizing and pipe sizing to high-demand points, and run a leak survey. Consider a larger receiver or sequencing if multiple compressors are on site.",
    },
    d6: {
      type: "diagnosis",
      prompt: "Internal leak or collapsed separator element",
      probableCause: "A ruptured or collapsed air/oil separator element, or a leak past a gasket or valve, lets compressed air escape internally instead of reaching the discharge line.",
      recommendedFix: "Isolate, fully depressurize, and inspect the separator element and sump-to-airend connections. Replace the separator element if collapsed or torn.",
      safetyWarning: "Confirm zero pressure on the sump/tank gauge before opening any pressurized component.",
    },
  },
  edges: [
    { from: "q1", label: "Never reaches setpoint", to: "q2" },
    { from: "q1", label: "Reaches setpoint, then drops quickly", to: "q5" },
    { from: "q2", label: "No, doesn't open fully", to: "d1" },
    { from: "q2", label: "Yes, opens fully", to: "q3" },
    { from: "q3", label: "Yes", to: "d2" },
    { from: "q3", label: "No", to: "q4" },
    { from: "q4", label: "Yes", to: "d3" },
    { from: "q4", label: "No", to: "d4" },
    { from: "q5", label: "Yes, recovers fine", to: "d5" },
    { from: "q5", label: "No, or noise/vibration present", to: "d6" },
  ],
};

const highTemperature: TreeSpec = {
  title: "High discharge/sump temperature or thermal shutdown",
  description: "Start here when the compressor is running hot or has tripped on high temperature.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is the oil level in the sump within the normal sight-glass range?" },
    q2: { type: "question", prompt: "Are the oil cooler and/or aftercooler fins visibly dirty or blocked?" },
    q3: { type: "question", prompt: "Is the cooling fan running at full speed in the correct direction?" },
    q4: { type: "question", prompt: "Does the thermostatic bypass valve route oil through the cooler once it's warmed up, rather than continuously bypassing it?" },
    q5: { type: "question", prompt: "Is room ambient temperature unusually high, or is hot exhaust air recirculating into the intake?" },
    d1: {
      type: "diagnosis",
      prompt: "Low oil level",
      probableCause: "Insufficient sump oil reduces the volume available to absorb and carry away heat from the airend, driving up discharge temperature.",
      recommendedFix: "Top up with the OEM-specified oil to the correct level and investigate the cause of the loss rather than just topping up repeatedly.",
      safetyWarning: "Only add oil with the unit stopped, depressurized, and locked out.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Fouled cooler reducing heat rejection",
      probableCause: "Dust or oil film on the cooler fins insulates them and cuts airflow through the core, so heat isn't rejected fast enough.",
      recommendedFix: "Clean the cooler core with low-pressure air or an approved degreaser per the OEM manual, and set a regular cleaning interval if the room is dusty.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Cooling fan fault",
      probableCause: "A failed fan motor, slipping belt, or incorrect rotation direction starves the cooler of airflow even though the core itself is clean.",
      recommendedFix: "Check fan motor operation, belt tension/condition, and rotation direction against the airflow arrow on the cooler housing.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Stuck thermostatic bypass valve",
      probableCause: "A thermostatic valve stuck in bypass routes hot oil straight back to the airend instead of through the cooler, regardless of how clean the cooler is.",
      recommendedFix: "Test or replace the thermostatic element/valve and confirm oil temperature changes appropriately as the unit warms up.",
    },
    d5: {
      type: "diagnosis",
      prompt: "High ambient temperature or poor room ventilation",
      probableCause: "Room temperature above the rated maximum inlet temperature, or recirculating exhaust air, raises operating temperature beyond the cooling system's design margin.",
      recommendedFix: "Improve room ventilation/ducting so exhaust vents outside, away from the intake, and confirm room temperature is within the OEM's rated range.",
    },
    d6: {
      type: "diagnosis",
      prompt: "Wrong oil grade or degraded oil",
      probableCause: "An oil type/viscosity not specified for this compressor, or oil that's oxidized and overdue for change, loses its ability to lubricate and transfer heat efficiently.",
      recommendedFix: "Confirm the oil matches the OEM-specified type and interval. Sample for oil analysis if condition is in doubt, and change oil and filter if overdue.",
    },
  },
  edges: [
    { from: "q1", label: "Low/below minimum", to: "d1" },
    { from: "q1", label: "Normal level", to: "q2" },
    { from: "q2", label: "Yes, fouled/blocked", to: "d2" },
    { from: "q2", label: "No, coolers look clean", to: "q3" },
    { from: "q3", label: "No - slow, stopped, or backwards", to: "d3" },
    { from: "q3", label: "Yes, fan looks correct", to: "q4" },
    { from: "q4", label: "No, seems to bypass when hot", to: "d4" },
    { from: "q4", label: "Yes, operates correctly", to: "q5" },
    { from: "q5", label: "Yes", to: "d5" },
    { from: "q5", label: "No", to: "d6" },
  ],
};

const oilCarryover: TreeSpec = {
  title: "Excessive oil carryover into the air system",
  description: "Start here when oil is showing up downstream in the compressed air.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is the sump/tank oil level above the normal maximum (overfilled)?" },
    q2: { type: "question", prompt: "How many hours are on the current air/oil separator element relative to its rated change interval?" },
    q3: { type: "question", prompt: "Is the scavenge (oil return) line from the separator back to the airend clear and unobstructed?" },
    q4: { type: "question", prompt: "Is the minimum pressure valve maintaining at least the OEM-minimum sump pressure while loaded?" },
    d1: {
      type: "diagnosis",
      prompt: "Overfilled sump",
      probableCause: "Oil filled above the maximum sight-glass mark gets churned and carried into the separator faster than it can knock down, pushing oil downstream.",
      recommendedFix: "Drain oil back to the correct sight-glass level with the unit stopped and depressurized.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Worn-out separator element",
      probableCause: "A separator element holds less oil mist as it ages; past its rated life it allows progressively more oil through into the discharge air.",
      recommendedFix: "Replace the air/oil separator element per the OEM-specified interval and inspect the scavenge line at the same time.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Blocked or disconnected scavenge line",
      probableCause: "If the scavenge line's orifice or check valve is blocked, kinked, or disconnected, oil pools in the separator housing and re-enters the air stream.",
      recommendedFix: "Remove and clean the scavenge line and its orifice/check valve, confirm it's connected, and verify oil return when running.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Minimum pressure valve not holding back-pressure",
      probableCause: "Running below the minimum specified sump pressure reduces the pressure differential the separator element relies on, so more oil mist escapes downstream.",
      recommendedFix: "Inspect and service the minimum pressure/check valve so it holds the OEM-specified minimum sump pressure under load.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Wrong oil type or oil foaming",
      probableCause: "An incorrect oil type, or oil that's degraded or contaminated and foaming, breaks down into a finer mist that passes through the separator element more easily.",
      recommendedFix: "Confirm the OEM-specified oil is in use and check for contamination. Drain and refill with the correct oil if contamination or foaming is found.",
    },
  },
  edges: [
    { from: "q1", label: "Yes, overfilled", to: "d1" },
    { from: "q1", label: "No, level is normal or low", to: "q2" },
    { from: "q2", label: "At or beyond rated change interval", to: "d2" },
    { from: "q2", label: "Well within its rated life", to: "q3" },
    { from: "q3", label: "No - blocked, kinked, or missing", to: "d3" },
    { from: "q3", label: "Yes, scavenge line is clear", to: "q4" },
    { from: "q4", label: "No - sump pressure runs low", to: "d4" },
    { from: "q4", label: "Yes, sump pressure is within spec", to: "d5" },
  ],
};

const wontLoad: TreeSpec = {
  title: "Runs but won't load (no output)",
  description: "Start here when the motor is running but the unit stays unloaded with no air output.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Does the controller display show a fault/alarm code, or is it just sitting unloaded with no demand signal?" },
    q2: { type: "question", prompt: "Is system/line pressure already above the compressor's load setpoint?" },
    q3: { type: "question", prompt: "Does the inlet valve actuator receive a control air or electrical signal to open when the controller commands load?" },
    d1: {
      type: "diagnosis",
      prompt: "Active controller fault is blocking load",
      probableCause: "The controller is deliberately holding the unit unloaded because of an active alarm, such as high temperature, a sensor fault, or a service-due lockout.",
      recommendedFix: "Read and clear the specific fault code per the controller manual, addressing the underlying condition rather than just clearing the alarm.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Normal unload — pressure already satisfied",
      probableCause: "The controller is correctly holding the unit unloaded because downstream pressure is already at or above the load setpoint.",
      recommendedFix: "No fault. If loading sooner is expected, review the load/unload setpoints against actual plant demand.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Broken load command wiring/tubing or failed solenoid",
      probableCause: "A failed load solenoid valve, broken control air tubing, or a wiring fault between the controller output and the inlet valve actuator prevents the load command from reaching the valve.",
      recommendedFix: "Trace the load signal from the controller output to the inlet valve actuator; test/replace the load solenoid and check tubing/wiring continuity.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Stuck or seized inlet valve",
      probableCause: "The inlet valve is mechanically stuck from corrosion, varnish buildup, or a damaged diaphragm/spring, and won't open even with a correct command.",
      recommendedFix: "Remove and inspect the inlet valve; clean, free up, or replace it and its diaphragm/spring as needed.",
    },
  },
  edges: [
    { from: "q1", label: "Shows a fault/alarm code", to: "d1" },
    { from: "q1", label: "No fault shown, just unloaded", to: "q2" },
    { from: "q2", label: "Yes, pressure is above load setpoint", to: "d2" },
    { from: "q2", label: "No, pressure is below load setpoint", to: "q3" },
    { from: "q3", label: "No signal reaches the actuator", to: "d3" },
    { from: "q3", label: "Signal arrives, but valve doesn't open", to: "d4" },
  ],
};

const shortCycling: TreeSpec = {
  title: "Cycles (starts/stops or loads/unloads) too frequently",
  description: "Start here when the compressor starts and stops, or loads and unloads, far more often than expected.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is this unit controlled by start/stop (motor stops between cycles) or load/unload (motor keeps running)?" },
    q2: { type: "question", prompt: "Is the receiver tank undersized for this compressor's output and the plant's demand pattern?" },
    q3: { type: "question", prompt: "Are the pressure switch's cut-in and cut-out setpoints close together (narrow differential)?" },
    q4: { type: "question", prompt: "Does the unit load and unload within a few seconds repeatedly, rather than running loaded for a reasonable stretch?" },
    q5: { type: "question", prompt: "Is the unload/modulation timer set very short, or is the load setpoint very close to the unload setpoint?" },
    d1: {
      type: "diagnosis",
      prompt: "Undersized air receiver",
      probableCause: "A receiver too small for this compressor's capacity and the plant's demand swings empties and refills quickly, cycling the motor far more often than its rated duty cycle.",
      recommendedFix: "Size the receiver per the OEM's start/stop guidance and add capacity, or switch this unit to load/unload control if the application allows it.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Pressure switch differential set too narrow",
      probableCause: "A small gap between cut-in and cut-out pressure means even normal demand swings make the compressor start and stop repeatedly.",
      recommendedFix: "Widen the pressure switch differential per OEM guidance to reduce cycling, while staying within the system's acceptable pressure band.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Leak or intermittent demand draining the receiver quickly",
      probableCause: "An air leak or an intermittent but sizeable demand is draining the receiver fast enough to trigger frequent restarts even with normal settings.",
      recommendedFix: "Run a leak survey on the distribution system and fix leaks found. Identify and, if possible, stagger any single large intermittent load.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Normal load/unload behavior — no fault found",
      probableCause: "Loading and unloading every minute or so as demand fluctuates is normal for load/unload control and isn't itself a fault.",
      recommendedFix: "No action needed. If energy use at low demand is a concern, consider whether a smaller trim compressor or VSD unit suits this duty better.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Load/unload setpoints or timer too tight",
      probableCause: "A load setpoint very close to the unload setpoint, or a minimum-run/unload timer set too short, lets the controller cycle the inlet valve rapidly instead of running loaded for a sensible stretch.",
      recommendedFix: "Widen the gap between load and unload pressure setpoints and confirm the minimum-load timer matches OEM recommendations.",
    },
    d6: {
      type: "diagnosis",
      prompt: "Receiver or demand issue causing rapid pressure swings",
      probableCause: "Even with correct controller settings, an undersized receiver or a demand pattern with rapid large swings can still cause frequent load/unload cycling.",
      recommendedFix: "Review receiver sizing and check for a specific intermittent large demand pulling pressure down quickly, addressing the root demand/storage issue rather than the controller settings.",
    },
  },
  edges: [
    { from: "q1", label: "Start/stop control", to: "q2" },
    { from: "q1", label: "Load/unload control", to: "q4" },
    { from: "q2", label: "Yes, receiver looks undersized", to: "d1" },
    { from: "q2", label: "No, receiver size looks adequate", to: "q3" },
    { from: "q3", label: "Yes, narrow differential", to: "d2" },
    { from: "q3", label: "No, differential looks normal", to: "d3" },
    { from: "q4", label: "Yes, rapid load/unload", to: "q5" },
    { from: "q4", label: "No, this looks normal", to: "d4" },
    { from: "q5", label: "Yes", to: "d5" },
    { from: "q5", label: "No, settings look correct", to: "d6" },
  ],
};

const lowOilPressure: TreeSpec = {
  title: "Low oil pressure / lubrication alarm",
  description: "Start here when a low oil pressure or lubrication fault is active.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Does this model use a dedicated oil pump, or does it rely on sump air pressure to circulate oil (check the manual/nameplate)?" },
    q2: { type: "question", prompt: "Does the oil pump run and turn freely, with oil present in its supply line?" },
    q3: { type: "question", prompt: "Is the oil filter pressure differential indicator showing restricted, or is the filter overdue?" },
    q4: { type: "question", prompt: "Is sump pressure reaching and holding at least the OEM minimum operating pressure under load?" },
    d1: {
      type: "diagnosis",
      prompt: "Oil pump or drive failure",
      probableCause: "A failed oil pump, sheared drive coupling/key, or an empty or blocked supply line stops oil circulation even though sump level may look fine.",
      recommendedFix: "Inspect the oil pump drive coupling and pump for damage; replace as needed and confirm the suction line is clear and primed.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Clogged oil filter",
      probableCause: "A clogged oil filter creates excess pressure drop across itself, starving the airend of the oil flow the low-pressure alarm monitors.",
      recommendedFix: "Replace the oil filter element per the OEM interval or whenever the differential indicator shows restriction.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Faulty pressure sensor/switch or wiring",
      probableCause: "With circulation and filtration confirmed normal, the alarm is most likely caused by a faulty oil pressure sensor/switch or a wiring fault rather than an actual lubrication problem.",
      recommendedFix: "Verify the sensor reading against a calibrated test gauge at the same port; replace the sensor/switch or repair wiring if it reads incorrectly.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Low sump pressure (minimum pressure valve fault)",
      probableCause: "On units that rely on sump pressure to push oil through the cooler and filter, running below the minimum specified sump pressure isn't enough to maintain proper oil circulation to the airend bearings and rotors.",
      recommendedFix: "Inspect and service the minimum pressure/check valve so sump pressure holds at or above the OEM-specified minimum under load.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Restricted oil cooler or filter raising circuit resistance",
      probableCause: "Even with adequate sump pressure, a heavily fouled oil cooler or a clogged filter can create enough resistance in the oil circuit that flow to the airend drops below what the alarm expects.",
      recommendedFix: "Check oil filter differential and inspect the oil cooler core for internal fouling; service or replace whichever component is restricting flow.",
    },
  },
  edges: [
    { from: "q1", label: "Dedicated oil pump", to: "q2" },
    { from: "q1", label: "Sump-pressure circulated (no separate pump)", to: "q4" },
    { from: "q2", label: "Pump doesn't turn / no oil supply", to: "d1" },
    { from: "q2", label: "Pump runs, oil is present", to: "q3" },
    { from: "q3", label: "Yes, restricted/overdue", to: "d2" },
    { from: "q3", label: "No, filter looks fine", to: "d3" },
    { from: "q4", label: "No, sump pressure is low", to: "d4" },
    { from: "q4", label: "Yes, sump pressure is within spec", to: "d5" },
  ],
};

const noiseVibration: TreeSpec = {
  title: "Abnormal noise or vibration",
  description: "Start here when the compressor is making unusual noise or vibrating more than normal.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is the noise/vibration present at start-up only, continuously while running, or specifically when loading/unloading?" },
    q2: { type: "question", prompt: "Does the knock or rattle go away within the first few seconds as the unit comes up to pressure/speed?" },
    q3: { type: "question", prompt: "Is the noise/vibration coming from the motor/drive end, or from the airend/compression end?" },
    d1: {
      type: "diagnosis",
      prompt: "Inlet valve or check valve slamming",
      probableCause: "A worn or poorly cushioned inlet valve or minimum-pressure/check valve can slam or chatter at the moment of loading or unloading, producing a sharp noise tied exactly to those events.",
      recommendedFix: "Inspect the inlet valve and check valve for worn seats, missing dampening elements, or incorrect spring tension; service or replace with OEM parts.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Normal transient start noise",
      probableCause: "A brief knock or rattle in the first few seconds as valves seat, oil pressure builds, and (on VSD units) the drive ramps up speed is normal on many rotary screw units.",
      recommendedFix: "No action needed if it consistently settles within a few seconds; monitor and note if the duration increases over time.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Liquid slugging or coupling/belt fault at start",
      probableCause: "A sharp bang at start can indicate liquid trapped in the airend before it can be compressed, or a damaged coupling/belt catching as the drive engages.",
      recommendedFix: "Inspect the coupling/belt and drive guard for damage. If liquid slugging is suspected, check for a stuck check valve allowing backflow into the airend while stopped, and have the airend inspected before further starts.",
      safetyWarning: "Lock out/tag out before inspecting any rotating drive components.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Worn motor bearings, belt, or coupling",
      probableCause: "Worn motor bearings, a loose or worn drive belt, or a worn/misaligned coupling produce continuous noise and vibration localized to the drive end.",
      recommendedFix: "Check belt tension and condition, coupling alignment, and motor bearing condition; replace or realign as needed.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Worn airend bearings or rotor damage",
      probableCause: "Worn airend bearings or rotor contact/damage produces continuous noise and vibration from the compression end and typically worsens over time.",
      recommendedFix: "Have the airend inspected by a qualified technician; this usually requires an overhaul or airend exchange rather than a field repair.",
    },
  },
  edges: [
    { from: "q1", label: "At start-up only", to: "q2" },
    { from: "q1", label: "Continuously while running", to: "q3" },
    { from: "q1", label: "Specifically when loading/unloading", to: "d1" },
    { from: "q2", label: "Yes, settles down quickly", to: "d2" },
    { from: "q2", label: "No, harsh bang or doesn't go away", to: "d3" },
    { from: "q3", label: "Motor/drive end", to: "d4" },
    { from: "q3", label: "Airend/compression end", to: "d5" },
  ],
};

const vsdFault: TreeSpec = {
  title: "VSD/inverter fault trip",
  description: "Start here when a variable speed drive (VFD/inverter) compressor has tripped on a drive fault.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Does the drive display a specific fault code, or has it stopped responding with no code shown?" },
    q2: { type: "question", prompt: "Does the fault code indicate an overcurrent/overload condition?" },
    q3: { type: "question", prompt: "Does the fault code indicate an overtemperature condition (drive heatsink or motor)?" },
    q4: { type: "question", prompt: "Does the fault code indicate an overvoltage or undervoltage condition on the supply/DC bus?" },
    d1: {
      type: "diagnosis",
      prompt: "Loss of control power to the drive",
      probableCause: "The drive has lost its control power supply, such as a blown fuse, tripped control breaker, or wiring fault, rather than detecting an actual operating fault.",
      recommendedFix: "Check control power fuses/breakers feeding the drive and verify supply voltage at the drive's control terminals before assuming a drive failure.",
      safetyWarning: "Lock out/tag out main power to the drive before opening its enclosure. Drive capacitors can retain dangerous voltage after power-off — wait the manufacturer-specified discharge time.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Drive overcurrent trip",
      probableCause: "The drive is detecting motor current above its trip threshold, which can stem from a mechanical issue, a motor fault, or a drive parameter set incorrectly for this motor.",
      recommendedFix: "Check that the motor turns freely and rule out mechanical causes of high current, then verify drive parameters (motor nameplate data, ramp times, current limit) match the installed motor.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Drive or motor overtemperature trip",
      probableCause: "The drive's heatsink temperature sensor, or a motor thermal sensor wired back to the drive, has tripped, usually from restricted cooling around the drive enclosure or a genuinely overheating motor.",
      recommendedFix: "Check ventilation/cooling fans around the drive enclosure and ensure panel filters aren't blocked. If the motor itself is hot, address cooling-airflow and load causes.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Supply voltage fault (over/undervoltage, line disturbance)",
      probableCause: "Incoming supply voltage outside the drive's rated window, or a disturbance such as a fast deceleration regenerating voltage back into the DC bus, trips the drive's voltage protection.",
      recommendedFix: "Measure incoming supply voltage against the drive's rated input range, and investigate site power quality if voltage is otherwise in spec.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Look up the specific manufacturer fault code",
      probableCause: "This fault code isn't one of the common categories above — drive manufacturers each define many specific codes beyond overcurrent, overtemperature, and voltage faults.",
      recommendedFix: "Look up the exact fault code in the drive's manual or the compressor's drive supplement for its specific meaning and recommended action before resetting.",
    },
  },
  edges: [
    { from: "q1", label: "Shows a specific fault code", to: "q2" },
    { from: "q1", label: "No code, unresponsive/blank display", to: "d1" },
    { from: "q2", label: "Yes, overcurrent/overload code", to: "d2" },
    { from: "q2", label: "No, different code", to: "q3" },
    { from: "q3", label: "Yes, overtemperature code", to: "d3" },
    { from: "q3", label: "No, different code", to: "q4" },
    { from: "q4", label: "Yes, voltage-related code", to: "d4" },
    { from: "q4", label: "No, a different/unlisted code", to: "d5" },
  ],
};

const separatorDifferential: TreeSpec = {
  title: "High air/oil separator differential pressure",
  description: "Start here when the separator differential pressure indicator is reading high.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is the differential pressure reading above the OEM's stated replacement threshold (commonly around 10-12 psi)?" },
    q2: { type: "question", prompt: "Has the oil been changed at the OEM-specified interval, or is it overdue/contaminated?" },
    d1: {
      type: "diagnosis",
      prompt: "Separator element due for replacement",
      probableCause: "The air/oil separator element accumulates contamination over time; once differential pressure crosses the OEM threshold it's restricting airflow enough to waste energy and risks element failure if left in service.",
      recommendedFix: "Replace the air/oil separator element per the OEM part number and torque spec, then reset/zero the differential indicator.",
      safetyWarning: "Fully depressurize and lock out the sump/tank before removing the separator housing cover.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Degraded oil accelerating separator fouling",
      probableCause: "Oxidized or contaminated oil breaks down and deposits varnish/sludge on the separator element faster than fresh oil, shortening its effective life.",
      recommendedFix: "Change the oil and filter at the correct interval with the OEM-specified oil; consider an oil analysis program to catch degradation early.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Operating environment contamination",
      probableCause: "Fine dust or process contaminants drawn in with the intake air, beyond what the air filter removes, are loading the separator element faster than normal for this duty cycle.",
      recommendedFix: "Check the intake air filter condition and rating for the environment, and consider a more frequent filter change schedule or improved room filtration.",
    },
  },
  edges: [
    { from: "q1", label: "Yes, above threshold", to: "d1" },
    { from: "q1", label: "No, but rising quickly", to: "q2" },
    { from: "q2", label: "Overdue or contaminated", to: "d2" },
    { from: "q2", label: "Within interval and looks normal", to: "d3" },
  ],
};

const wontStart: TreeSpec = {
  title: "Won't start — no response to the start command",
  description: "Start here when pressing start produces no reaction at all, or the unit stops responding before the motor ever turns.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "When you press start, does anything happen at all (display change, indicator light, audible click)?" },
    q2: { type: "question", prompt: "Is the main disconnect switched on, with supply voltage present at its incoming terminals?" },
    q3: { type: "question", prompt: "Is an emergency stop button pressed in, or is a door/safety interlock circuit open?" },
    q4: { type: "question", prompt: "Does the controller display show an active fault or lockout code?" },
    q5: { type: "question", prompt: "Does the main contactor audibly pull in when start is commanded?" },
    d1: {
      type: "diagnosis",
      prompt: "No incoming power",
      probableCause: "The disconnect is open, an upstream breaker has tripped, or supply power to the unit has been lost entirely, so the control circuit never energizes.",
      recommendedFix: "Confirm the disconnect is closed and check upstream breakers/fuses and incoming supply voltage before assuming a compressor fault.",
      safetyWarning: "Use a meter rated for the voltage present; treat the circuit as live until proven otherwise.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Blown control fuse or failed control transformer",
      probableCause: "Main power can be present while a blown control fuse or a failed control transformer still leaves the control circuit and display dead.",
      recommendedFix: "Check control circuit fuses and the control transformer's primary/secondary voltage; replace the fuse or transformer as needed.",
      safetyWarning: "Lock out/tag out before opening the control panel.",
    },
    d3: {
      type: "diagnosis",
      prompt: "E-stop or safety interlock engaged",
      probableCause: "An emergency stop that's pressed in, or an open door/guard interlock, deliberately blocks starting until it's reset and the circuit is closed.",
      recommendedFix: "Release/reset the E-stop and confirm all doors and guards are closed and their interlock switches are made up.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Active controller fault/lockout is blocking start",
      probableCause: "The controller is refusing to start because of an unresolved alarm such as a sensor fault, service lockout, or unacknowledged prior trip.",
      recommendedFix: "Read and address the specific fault code per the controller manual before attempting to clear it and restart.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Start relay/contactor failed to energize",
      probableCause: "The start command reaches the controller but the relay or main contactor coil isn't energizing, from a failed coil, blown control fuse on that circuit, or a broken interlock in series with it.",
      recommendedFix: "Check for control voltage at the contactor coil terminals when start is commanded; test/replace the coil or trace the interlock chain feeding it.",
      safetyWarning: "Lock out/tag out before working in the contactor compartment.",
    },
    d6: {
      type: "diagnosis",
      prompt: "Contactor closes but motor doesn't turn",
      probableCause: "With the contactor confirmed closing, the fault has moved to the motor or its supply rather than the start/control circuit.",
      recommendedFix: "Continue with the 'Contactor closes but motor hums, won't turn, or trips instantly' fault tree to isolate a single-phasing, winding, or mechanical seizure fault.",
    },
  },
  edges: [
    { from: "q1", label: "Nothing happens at all", to: "q2" },
    { from: "q1", label: "Something happens, but it doesn't run", to: "q3" },
    { from: "q2", label: "No, no power at the disconnect", to: "d1" },
    { from: "q2", label: "Yes, power is present", to: "d2" },
    { from: "q3", label: "Yes", to: "d3" },
    { from: "q3", label: "No", to: "q4" },
    { from: "q4", label: "Yes, a fault/lockout is shown", to: "d4" },
    { from: "q4", label: "No fault shown", to: "q5" },
    { from: "q5", label: "No, it never pulls in", to: "d5" },
    { from: "q5", label: "Yes, it pulls in", to: "d6" },
  ],
};

const motorWontTurn: TreeSpec = {
  title: "Contactor closes but motor hums, won't turn, or trips instantly",
  description: "Start here when the main contactor closes but the motor doesn't run normally — it hums without turning, or trips immediately.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Does the motor hum without turning, or does it trip the overload/breaker within a second or two of the contactor closing?" },
    q2: { type: "question", prompt: "With power isolated and locked out, does the airend shaft turn freely by hand?" },
    q3: { type: "question", prompt: "Are all three supply phases present and reading roughly equal voltage at the motor terminals or contactor output?" },
    d1: {
      type: "diagnosis",
      prompt: "Seized airend or jammed drive train",
      probableCause: "A seized airend, sheared coupling key, or jammed belt drive stops the shaft from turning, so the motor can only hum against the load it can't move.",
      recommendedFix: "Do not force the shaft. Investigate the cause of the seizure (liquid ingestion, bearing failure, foreign object) before any further start attempts.",
      safetyWarning: "Lock out/tag out and isolate stored air pressure before touching internal components.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Single-phasing — open phase, blown fuse, or failed contactor pole",
      probableCause: "A motor missing one of its three supply phases can't develop starting torque and just hums; this is commonly an open fuse, a tripped upstream breaker, or one contactor pole not closing.",
      recommendedFix: "Identify and restore the missing phase — check fuses, breaker poles, and contactor contacts on each phase — before attempting another start.",
      safetyWarning: "Lock out/tag out before testing at the contactor or terminals; running a three-phase motor single-phased for more than a few seconds can damage the windings.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Motor winding fault",
      probableCause: "With the shaft confirmed free and all three phases present and balanced, a humming motor that won't turn points to an internal winding or rotor fault.",
      recommendedFix: "Megger-test the windings and have the motor bench-tested or rewound by a qualified motor shop.",
      safetyWarning: "Lock out/tag out before disconnecting motor leads.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Locked-rotor / direct short trip",
      probableCause: "An almost-instant trip on contactor closing usually means the motor or its supply wiring is presenting a near direct-short or full locked-rotor current, from a winding fault, seized airend, or a wiring fault.",
      recommendedFix: "Isolate and megger-test the motor, and confirm the airend turns freely by hand, before re-energizing.",
      safetyWarning: "Lock out/tag out before any further testing; do not repeatedly attempt to restart through a trip.",
    },
  },
  edges: [
    { from: "q1", label: "Hums without turning", to: "q2" },
    { from: "q1", label: "Trips almost instantly", to: "d4" },
    { from: "q2", label: "No, it's stiff or won't turn", to: "d1" },
    { from: "q2", label: "Yes, turns freely", to: "q3" },
    { from: "q3", label: "No, a phase is missing or unbalanced", to: "d2" },
    { from: "q3", label: "Yes, all three phases look correct", to: "d3" },
  ],
};

const wrongRotation: TreeSpec = {
  title: "Wrong rotation direction after rewiring or a supply change",
  description: "Start here when checking rotation direction after electrical work, a motor replacement, or a supply/generator changeover.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Did this come up right after a motor replacement, rewiring, or other electrical work on this unit?" },
    q2: { type: "question", prompt: "Did this come up after switching to a different supply source (generator, alternate feeder, utility work)?" },
    q3: { type: "question", prompt: "Does the cooling fan or motor shaft rotate opposite to the direction arrow marked on the motor or airend housing?" },
    d1: {
      type: "diagnosis",
      prompt: "Two supply phases swapped during electrical work",
      probableCause: "Swapping any two of the three motor leads during rewiring or a motor change reverses rotation direction.",
      recommendedFix: "Stop the unit immediately if still running. Swap any two of the three motor leads back and re-check rotation against the housing arrow before running again.",
      safetyWarning: "Lock out/tag out before changing motor lead connections. Running a rotary screw airend backwards even briefly can damage it — stop at the first sign of reverse rotation.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Phase rotation differs between supply sources",
      probableCause: "Not all supply sources (utility, generator, alternate feeder) are guaranteed to have the same phase rotation; switching sources can reverse motor direction even though wiring at the compressor hasn't changed.",
      recommendedFix: "Confirm phase rotation/sequence at each available source with a phase rotation meter, and correct wiring at the transfer switch or source so rotation stays consistent.",
      safetyWarning: "Lock out/tag out before working at the transfer switch or supply terminals.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Confirmed reverse rotation — phase sequence is swapped upstream",
      probableCause: "Rotation opposite the housing arrow confirms a phase-sequence problem upstream of the motor, not a mechanical fault.",
      recommendedFix: "Stop the unit immediately. Verify phase sequence with a phase rotation meter and correct the wiring at the supply or motor terminals.",
      safetyWarning: "Lock out/tag out before changing any wiring. Do not continue running with confirmed reverse rotation.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Rotation is correct — the original symptom has another cause",
      probableCause: "Rotation direction matches the housing arrow, so reverse rotation isn't the explanation for whatever prompted this check.",
      recommendedFix: "Use the fault tree matching the actual symptom observed (noise, low output, high temperature, etc.) instead.",
    },
  },
  edges: [
    { from: "q1", label: "Yes", to: "d1" },
    { from: "q1", label: "No", to: "q2" },
    { from: "q2", label: "Yes", to: "d2" },
    { from: "q2", label: "No", to: "q3" },
    { from: "q3", label: "Yes, it's reversed", to: "d3" },
    { from: "q3", label: "No, rotation matches the arrow", to: "d4" },
  ],
};

const condensateDrain: TreeSpec = {
  title: "Condensate drain not working correctly",
  description: "Start here for a separator/receiver condensate drain that won't discharge water, runs continuously, or lets the vessel flood.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is the drain a timed solenoid, a float-operated drain, or a manual ball valve?" },
    q2: { type: "question", prompt: "Does the solenoid audibly click or cycle at its set interval?" },
    q3: { type: "question", prompt: "When the solenoid cycles, does water discharge normally then stop, not at all, or continuously/drip non-stop?" },
    q4: { type: "question", prompt: "Is the float mechanism free to move and not coated in oil sludge?" },
    d1: {
      type: "diagnosis",
      prompt: "Failed solenoid coil, timer board, or wiring",
      probableCause: "If the drain solenoid never cycles at all, the timer board, the coil, or the wiring feeding it has failed.",
      recommendedFix: "Check control voltage at the solenoid when the timer should fire, and test/replace the coil, timer board, or wiring as needed.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Blocked drain line, strainer, or valve seat",
      probableCause: "The solenoid is cycling correctly but debris or scale in the line, strainer, or valve seat is blocking discharge, letting the vessel fill with water.",
      recommendedFix: "Isolate, depressurize, and clean or replace the drain line, strainer, and valve seat.",
      safetyWarning: "Confirm zero pressure before opening the drain line or valve body.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Solenoid valve stuck open or worn seat",
      probableCause: "A solenoid valve stuck open, or a worn/damaged seat, lets it discharge continuously or drip constantly instead of cycling, wasting compressed air and potentially draining oil with the water.",
      recommendedFix: "Clean or replace the solenoid valve and its seat; strain/filter the line if debris is the recurring cause.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Fouled or stuck float mechanism",
      probableCause: "Oil sludge or debris coating the float restricts its movement, so it can't rise and trigger drainage even as water accumulates.",
      recommendedFix: "Remove and clean the float mechanism and its chamber; consider an automatic timed or demand drain if fouling recurs often.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Failed float switch or pilot valve",
      probableCause: "With the float confirmed free-moving, the float switch or pilot valve it operates has failed electrically or mechanically.",
      recommendedFix: "Test and replace the float switch or pilot valve assembly.",
    },
    d6: {
      type: "diagnosis",
      prompt: "Manual drain depends on the operator",
      probableCause: "A manual ball valve drain only works if someone opens it regularly; missed draining lets water and oil accumulate in the vessel.",
      recommendedFix: "Confirm a documented manual draining schedule is being followed, or convert to an automatic timed or demand drain to remove the dependency on manual action.",
    },
    d7: {
      type: "diagnosis",
      prompt: "Drain is operating correctly — check moisture load or drain interval",
      probableCause: "The solenoid cycles and discharges normally; if water still accumulates, the timed interval may be too long for the moisture load produced (humid ambient, multiple compressors, or the separator/receiver isn't the actual problem).",
      recommendedFix: "Shorten the drain interval, confirm the separator/receiver itself isn't oversized for this duty, and recheck moisture levels after adjusting.",
    },
  },
  edges: [
    { from: "q1", label: "Timed solenoid", to: "q2" },
    { from: "q1", label: "Float-operated", to: "q4" },
    { from: "q1", label: "Manual ball valve", to: "d6" },
    { from: "q2", label: "No, never cycles", to: "d1" },
    { from: "q2", label: "Yes, it cycles", to: "q3" },
    { from: "q3", label: "Not at all", to: "d2" },
    { from: "q3", label: "Continuously / drips non-stop", to: "d3" },
    { from: "q3", label: "Normally, then stops", to: "d7" },
    { from: "q4", label: "No, sluggish or fouled", to: "d4" },
    { from: "q4", label: "Yes, float moves freely", to: "d5" },
  ],
};

const reliefValve: TreeSpec = {
  title: "Pressure relief/safety valve lifts or won't reseat",
  description: "Start here when a sump, receiver, or line safety relief valve has discharged, or won't stop venting after lifting.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Did the valve lift and then fully reseat (stop venting), or is it still leaking/venting now?" },
    q2: { type: "question", prompt: "Is actual operating pressure at the valve's location exceeding its stamped set pressure (compare a calibrated gauge to the valve's rating)?" },
    q3: { type: "question", prompt: "Has the valve been manually tested (lifted) recently, or is there visible debris/corrosion on or near the seat?" },
    d1: {
      type: "diagnosis",
      prompt: "System is genuinely overpressuring",
      probableCause: "Operating pressure is actually reaching or exceeding the valve's set pressure, which means the valve did its job — the real fault is whatever let pressure climb that high, such as a stuck regulator/control, a blocked downstream line, or an incorrect setpoint.",
      recommendedFix: "Find and fix the cause of the overpressure (controller setpoint, stuck valve, blocked line) before considering the relief valve itself the problem. Do not raise the valve's set pressure to stop it lifting.",
      safetyWarning: "Treat an active overpressure condition seriously — isolate and depressurize before further investigation if pressure is climbing uncontrolled.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Valve has weakened or drifted and needs testing/replacement",
      probableCause: "Operating pressure reads normal, well below the stamped set pressure, so a valve that still lifted has likely weakened (spring fatigue, corrosion) and is opening below its rated setting.",
      recommendedFix: "Have the valve bench-tested against its stamped set pressure, or replace it — relief valves aren't field-adjustable and shouldn't be relied on once suspected of drifting.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Debris or corrosion preventing the valve from reseating",
      probableCause: "Particles or corrosion product lodged on the seat during a recent lift (test or genuine) can hold the disc just off the seat, causing continued leakage even at normal pressure.",
      recommendedFix: "Replace the valve rather than attempting to clean and reuse a safety relief valve — debris on a safety device's seat is not a field-serviceable repair.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Worn or damaged valve seat/spring — replace the valve",
      probableCause: "With no recent test and no visible debris, continued leakage after lifting points to a worn seat or fatigued spring inside the valve.",
      recommendedFix: "Replace the relief valve; do not attempt to disassemble or adjust a safety relief valve in the field.",
    },
  },
  edges: [
    { from: "q1", label: "Fully reseated, not currently venting", to: "q2" },
    { from: "q1", label: "Still leaking/venting now", to: "q3" },
    { from: "q2", label: "Yes, pressure is at/above the valve's rating", to: "d1" },
    { from: "q2", label: "No, pressure reads normal", to: "d2" },
    { from: "q3", label: "Yes, recently tested or debris/corrosion visible", to: "d3" },
    { from: "q3", label: "No, neither", to: "d4" },
  ],
};

const controllerFrozen: TreeSpec = {
  title: "Controller display frozen, unresponsive, or showing incorrect data",
  description: "Start here when the control panel is powered but won't respond to keypresses, is frozen, or shows garbled or clearly wrong readings.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is the entire display/keypad unresponsive, or are specific readings wrong while the rest of the panel works normally?" },
    q2: { type: "question", prompt: "Does briefly cycling control power (if safe to do so) clear the issue?" },
    q3: { type: "question", prompt: "Is a remote monitoring, BMS, or network connection also reporting a communications fault?" },
    d1: {
      type: "diagnosis",
      prompt: "Controller software lockup",
      probableCause: "The controller's software has locked up or frozen, a known failure mode that a power cycle typically clears without indicating a hardware fault.",
      recommendedFix: "Note the time and conditions when this happened. If it recurs often, report the pattern to the OEM/controller manufacturer — frequent lockups can indicate a firmware issue worth a software update.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Failed keypad/display module or main control board",
      probableCause: "A panel that stays unresponsive even after a power cycle points to a hardware fault in the display module, keypad, or main control board rather than a software hang.",
      recommendedFix: "Have the control board/display module bench-tested and replaced by a qualified technician; back up any custom setpoints/configuration first if possible.",
      safetyWarning: "Lock out/tag out before opening the control enclosure.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Network/comms card or wiring fault",
      probableCause: "With the local panel itself working, a simultaneous remote/BMS communications fault points to the comms card, its configuration, or the network wiring rather than the main controller.",
      recommendedFix: "Check the comms card's status indicators, network cabling/termination, and configured address/protocol settings against the BMS side.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Failed sensor or wiring for that specific reading",
      probableCause: "If only one or two readings are wrong while the rest of the panel operates normally, the fault is most likely in that specific sensor or its wiring, not the controller itself.",
      recommendedFix: "Verify the suspect reading against an independent calibrated instrument at the same point, then test/replace the sensor or repair its wiring.",
    },
  },
  edges: [
    { from: "q1", label: "Entire panel is frozen/unresponsive", to: "q2" },
    { from: "q1", label: "Specific reading(s) are wrong, rest works fine", to: "d4" },
    { from: "q2", label: "Yes, that clears it", to: "d1" },
    { from: "q2", label: "No, still unresponsive", to: "q3" },
    { from: "q3", label: "Yes, comms fault too", to: "d3" },
    { from: "q3", label: "No, just the local panel", to: "d2" },
  ],
};

const externalOilLeak: TreeSpec = {
  title: "Oil leaking externally from the unit",
  description: "Start here when oil is visibly leaking or pooling outside the compressor package. For oil appearing downstream in the air system instead, use the oil carryover fault tree.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Can the leak be pinpointed to one area: the airend shaft seal, a hose/fitting/gasket, the oil filter or cooler, or the drain valve/sight glass?" },
    q2: { type: "question", prompt: "Is sump pressure running above its normal operating range when this is noticed?" },
    d1: {
      type: "diagnosis",
      prompt: "Worn airend shaft seal",
      probableCause: "A worn or failed shaft seal where the motor/coupling meets the airend lets pressurized oil weep out along the shaft.",
      recommendedFix: "Have the shaft seal replaced by a qualified technician; this typically requires partial airend disassembly.",
      safetyWarning: "Lock out/tag out and fully depressurize before any disassembly.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Loose or degraded fitting/gasket",
      probableCause: "A loose connection, degraded O-ring, or failed gasket at a hose, pipe joint, or cover lets oil seep out under normal sump pressure.",
      recommendedFix: "Tighten to the correct torque or replace the seal/gasket at the identified point; depressurize first.",
      safetyWarning: "Confirm zero pressure before loosening any fitting.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Loose or improperly seated filter, or a cracked cooler",
      probableCause: "An oil filter not seated/torqued correctly, or a cracked or corroded oil cooler core, leaks oil at that component specifically.",
      recommendedFix: "Reseat and correctly torque the filter, or have the cooler pressure-tested and replaced if cracked.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Worn drain valve seal or cracked sight glass",
      probableCause: "A worn drain valve seal or a cracked/loose sight glass leaks continuously or when pressure rises, independent of the rest of the oil system.",
      recommendedFix: "Replace the drain valve seal or sight glass assembly; depressurize before removal.",
    },
    d5: {
      type: "diagnosis",
      prompt: "Excess sump pressure forcing oil past seals",
      probableCause: "Sump pressure above the normal operating range pushes oil past seals and gaskets that would otherwise hold it back, even if those components aren't themselves worn.",
      recommendedFix: "Check the minimum pressure valve and blowdown valve for correct operation, and confirm sump pressure stays within the OEM-specified range under load.",
    },
    d6: {
      type: "diagnosis",
      prompt: "Clean the area, run briefly, and re-inspect",
      probableCause: "A general oily film without a clear single source is hard to diagnose accurately until the area is cleaned, since old residue masks where new oil is actually coming from.",
      recommendedFix: "Degrease the suspect area, run the unit for a short period, and re-inspect with a light to trace the leak to its actual source before doing further work.",
    },
  },
  edges: [
    { from: "q1", label: "Shaft seal area", to: "d1" },
    { from: "q1", label: "Hose, fitting, or gasket", to: "d2" },
    { from: "q1", label: "Oil filter or cooler", to: "d3" },
    { from: "q1", label: "Drain valve or sight glass", to: "d4" },
    { from: "q1", label: "Can't isolate / general weeping", to: "q2" },
    { from: "q2", label: "Yes, sump pressure is high", to: "d5" },
    { from: "q2", label: "No, sump pressure is normal", to: "d6" },
  ],
};

const wontUnload: TreeSpec = {
  title: "Runs continuously loaded and never unloads",
  description: "Start here when the compressor stays loaded even though downstream demand should let it unload, or it ignores the unload setpoint.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Compare a calibrated gauge to the controller's pressure reading — does the controller's displayed pressure match actual system pressure?" },
    q2: { type: "question", prompt: "Is actual system pressure reaching the controller's unload setpoint?" },
    q3: { type: "question", prompt: "Does the inlet valve actuator receive an unload command and visibly move when the controller commands unload?" },
    d1: {
      type: "diagnosis",
      prompt: "Faulty pressure transducer/sensor feeding the controller",
      probableCause: "If the controller's displayed pressure doesn't match an independent gauge, the controller is making load/unload decisions on bad data from a faulty transducer or its wiring.",
      recommendedFix: "Test/replace the pressure transducer and check its wiring; verify the controller reading matches a calibrated gauge afterward.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Genuine demand — pressure isn't actually reaching the unload setpoint",
      probableCause: "The controller is correctly keeping the unit loaded because real system pressure genuinely hasn't reached the unload setpoint yet, often from ongoing demand or a leak.",
      recommendedFix: "This isn't a compressor fault. Run a leak survey and review whether demand exceeds what's expected, or whether the unload setpoint itself needs review.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Controller logic/output fault or wiring fault to the unload solenoid",
      probableCause: "The controller has the data to know it should unload, but no command signal is reaching the unload solenoid/actuator, from an internal logic fault, failed output, or broken wiring.",
      recommendedFix: "Trace the unload command from the controller output to the actuator; test the controller's output and the wiring/solenoid in between.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Stuck-open inlet valve or failed unload solenoid",
      probableCause: "The unload command is reaching the valve, but the valve itself is mechanically stuck open or the solenoid that should drive it has failed.",
      recommendedFix: "Remove and inspect the inlet valve and unload solenoid; clean, free up, or replace as needed.",
    },
  },
  edges: [
    { from: "q1", label: "No, readings don't match", to: "d1" },
    { from: "q1", label: "Yes, readings match", to: "q2" },
    { from: "q2", label: "No, true pressure is below the unload setpoint", to: "d2" },
    { from: "q2", label: "Yes, pressure is at/above setpoint", to: "q3" },
    { from: "q3", label: "No command reaches the actuator", to: "d3" },
    { from: "q3", label: "Command arrives, but valve doesn't close", to: "d4" },
  ],
};

const blowdownValve: TreeSpec = {
  title: "Blowdown (sump vent) valve fault",
  description: "Start here for a hard or slow restart after stopping, a loud venting/backspin noise at shutdown, or continuous hissing while running.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Is the problem continuous hissing/venting while the unit is running normally, or trouble/noise specifically around shutdown and restart?" },
    q2: { type: "question", prompt: "Does the blowdown valve audibly vent sump pressure within a few seconds of the unit stopping?" },
    d1: {
      type: "diagnosis",
      prompt: "Blowdown valve leaking or stuck open while running",
      probableCause: "A blowdown valve that's leaking or stuck open while the unit is running and loaded wastes compressed air and can prevent the sump from building or holding its normal operating pressure.",
      recommendedFix: "Inspect the blowdown valve seat and solenoid for debris or wear and replace if it won't seal while running.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Blowdown valve/solenoid failed closed",
      probableCause: "If the blowdown valve doesn't vent sump pressure shortly after shutdown, the sump stays pressurized into the next start, forcing the motor to start against load and draw high current, and can cause a loud release later when it's disturbed.",
      recommendedFix: "Test and replace the blowdown valve/solenoid so it reliably vents sump pressure within the OEM-specified time after each stop.",
      safetyWarning: "A sump that hasn't vented can still be pressurized — confirm zero pressure on the gauge before opening it.",
    },
    d3: {
      type: "diagnosis",
      prompt: "Restart difficulty likely isn't the blowdown valve",
      probableCause: "With the blowdown valve confirmed venting normally at shutdown, hard restarts or noise are more likely caused by the minimum pressure valve holding residual pressure, or by cold/high-viscosity oil increasing starting drag.",
      recommendedFix: "Check the minimum pressure valve for correct operation and confirm oil viscosity/temperature at restart matches the OEM's cold-start guidance.",
    },
  },
  edges: [
    { from: "q1", label: "Continuous hissing while running", to: "d1" },
    { from: "q1", label: "Noise or hard restart at/after shutdown", to: "q2" },
    { from: "q2", label: "No, doesn't vent", to: "d2" },
    { from: "q2", label: "Yes, vents normally", to: "d3" },
  ],
};

const milkyOil: TreeSpec = {
  title: "Oil appears milky or water-contaminated",
  description: "Start here when sump oil looks cloudy or milky rather than clear, indicating water contamination rather than a mechanical fault.",
  root: "q1",
  nodes: {
    q1: { type: "question", prompt: "Does the unit run loaded for long, sustained stretches, or does it mostly cycle on/off, run lightly loaded, or sit idle for periods?" },
    q2: { type: "question", prompt: "Has the thermostatic bypass valve's setting been checked recently against the OEM-specified minimum operating temperature?" },
    q3: { type: "question", prompt: "Is ambient humidity unusually high, or has the unit recently been relocated from a cooler/drier area to a more humid one?" },
    d1: {
      type: "diagnosis",
      prompt: "Insufficient run time to reach normal operating temperature",
      probableCause: "Frequent cycling, light loading, or idle periods can keep bulk oil temperature below the point where absorbed moisture boils back off, letting water accumulate and emulsify in the oil instead.",
      recommendedFix: "Review duty cycle against the OEM's minimum run-time guidance; consider load management or a smaller/sequenced compressor if light-load running is unavoidable.",
    },
    d2: {
      type: "diagnosis",
      prompt: "Thermostatic valve set point too low",
      probableCause: "A thermostatic bypass valve opening to the cooler too early keeps bulk oil temperature below the moisture boil-off point even during sustained loaded running.",
      recommendedFix: "Check the thermostatic element's opening temperature against OEM spec and replace it if it's opening too soon.",
    },
    d3: {
      type: "diagnosis",
      prompt: "High ambient humidity overwhelming normal moisture handling",
      probableCause: "Very high ambient humidity increases the amount of moisture drawn in and condensed with the compressed air, which can outpace the oil's normal ability to shed it even when running correctly.",
      recommendedFix: "Improve room ventilation/dehumidification if practical, and increase oil sampling/change frequency while humidity remains high.",
    },
    d4: {
      type: "diagnosis",
      prompt: "Possible coolant or condensate ingress into the sump",
      probableCause: "On water-cooled units, an internal coolant leak can introduce water directly into the oil; on any unit, a condensate drain plumbed or backfeeding incorrectly can do the same.",
      recommendedFix: "Inspect for an internal coolant leak (water-cooled units) and confirm condensate drains route away from, not into, the oil sump.",
    },
  },
  edges: [
    { from: "q1", label: "Mostly cycles, lightly loaded, or idle often", to: "d1" },
    { from: "q1", label: "Runs loaded for sustained periods", to: "q2" },
    { from: "q2", label: "No / unsure", to: "d2" },
    { from: "q2", label: "Yes, setting is correct", to: "q3" },
    { from: "q3", label: "Yes", to: "d3" },
    { from: "q3", label: "No", to: "d4" },
  ],
};

const trees: TreeSpec[] = [
  overloadTrip,
  lowPressure,
  highTemperature,
  oilCarryover,
  wontLoad,
  shortCycling,
  lowOilPressure,
  noiseVibration,
  vsdFault,
  separatorDifferential,
  wontStart,
  motorWontTurn,
  wrongRotation,
  condensateDrain,
  reliefValve,
  controllerFrozen,
  externalOilLeak,
  wontUnload,
  blowdownValve,
  milkyOil,
];

async function createFaultTree(spec: TreeSpec, equipmentIds: string[]) {
  const [tree] = await db
    .insert(faultTree)
    .values({
      title: spec.title,
      description: spec.description,
      equipmentScope: equipmentIds.length ? "model_scoped" : "type_scoped",
      scopedEquipmentType: equipmentIds.length ? null : "compressor",
      status: "draft",
    })
    .returning();

  const idByKey = new Map<string, string>();
  for (const [key, node] of Object.entries(spec.nodes)) {
    const [row] = await db
      .insert(faultTreeNode)
      .values({
        faultTreeId: tree.id,
        nodeType: node.type,
        prompt: node.prompt,
        probableCause: node.type === "diagnosis" ? node.probableCause : null,
        recommendedFix: node.type === "diagnosis" ? node.recommendedFix : null,
        safetyWarning: node.type === "diagnosis" ? node.safetyWarning ?? null : null,
      })
      .returning();
    idByKey.set(key, row.id);
  }

  const sortCounters = new Map<string, number>();
  await db.insert(faultTreeBranch).values(
    spec.edges.map((edge) => {
      const sortOrder = sortCounters.get(edge.from) ?? 0;
      sortCounters.set(edge.from, sortOrder + 1);
      return {
        fromNodeId: idByKey.get(edge.from)!,
        label: edge.label,
        toNodeId: idByKey.get(edge.to)!,
        sortOrder,
      };
    })
  );

  if (equipmentIds.length) {
    await db
      .insert(faultTreeEquipment)
      .values(equipmentIds.map((equipmentId) => ({ faultTreeId: tree.id, equipmentId })));
  }

  await db
    .update(faultTree)
    .set({ rootNodeId: idByKey.get(spec.root)!, status: "published" })
    .where(eq(faultTree.id, tree.id));

  console.log(`  - ${spec.title} (${idByKey.size} nodes, ${spec.edges.length} branches)`);
}

async function main() {
  console.log("Looking up rotary screw electric air compressors...");

  const compressors = await db.query.equipment.findMany({
    where: eq(equipment.type, "compressor"),
  });

  const rotaryScrewElectric = compressors.filter((c) => {
    const specs = (c.specs as Record<string, unknown>) ?? {};
    const isRotaryScrew = specs.compressorStyle === "rotary_screw";
    const isElectric = !specs.powerSource || specs.powerSource === "electric";
    return isRotaryScrew && isElectric;
  });

  const rotaryScrewIds = rotaryScrewElectric.map((c) => c.id);

  if (rotaryScrewIds.length === 0) {
    console.warn(
      "No equipment found with compressorStyle = rotary_screw and an electric power source. Falling back to scoping these fault trees to all compressors (type_scoped) so they're still visible."
    );
  } else {
    console.log(
      `Found ${rotaryScrewIds.length} rotary screw electric compressor(s): ${rotaryScrewElectric
        .map((c) => c.displayName)
        .join(", ")}`
    );
  }

  const vsdIds = rotaryScrewElectric
    .filter((c) => ((c.specs as Record<string, unknown>) ?? {}).driveType === "vsd")
    .map((c) => c.id);

  const existingTitles = new Set(
    (await db.query.faultTree.findMany()).map((t) => t.title)
  );

  console.log("Creating fault trees...");

  for (const spec of trees) {
    if (existingTitles.has(spec.title)) {
      console.log(`  - ${spec.title} (already exists, skipping)`);
      continue;
    }
    const equipmentIds = spec === vsdFault ? (vsdIds.length ? vsdIds : rotaryScrewIds) : rotaryScrewIds;
    await createFaultTree(spec, equipmentIds);
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
