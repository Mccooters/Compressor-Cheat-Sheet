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
