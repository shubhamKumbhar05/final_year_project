import { jsx, jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
const TOTAL_SEGMENTS = 20;
const INITIAL_WINDOW_SIZE = 4;
const SEGMENT_SIZE = 0.22;
const SEGMENT_STRIDE = 0.27;
const BUFFER_CAPACITY = 5;
const FILL_PER_SEGMENT = 1 / BUFFER_CAPACITY;
const CLIENT_X = -4.5;
const SERVER_X = 5;
const QUEUE_Y = 1;
const QUEUE_START_X = -5;
const TANK_RADIUS = 0.4;
const TANK_HEIGHT = 1.6;
const SEGMENT_TRAVEL_SPEED = 0.014;
const ACK_TRAVEL_SPEED = 0.016;
const SEGMENT_STAGGER = 0.25;
const POST_ACK_PAUSE = 0.9;
function FlowControlViz({ isRunning = false, onMessage, resetTrigger = 0, drainSpeed = 0.5, simulateFullBuffer = false, clearBuffer = 0 }) {
  const groupRef = useRef(null);
  const timeRef = useRef(0);
  const [renderState, setRenderState] = useState({
    time: 0,
    windowSize: INITIAL_WINDOW_SIZE,
    windowOffset: 0,
    bufferLevel: 0,
    sentSegments: /* @__PURE__ */ new Set(),
    flyingSegments: [],
    ackPulses: [],
    serverFlash: 0,
    gearRotation: 0,
    frozen: false,
    persistTimerProgress: 0,
    probePosition: -1,
    probeAckPosition: -1,
    probeAckRwnd: 0,
    thawFlash: 0,
    frozenAtOffset: 0
  });
  const phaseRef = useRef("idle");
  const windowSizeRef = useRef(INITIAL_WINDOW_SIZE);
  const windowOffsetRef = useRef(0);
  const bufferLevelRef = useRef(0);
  const sentSegmentsRef = useRef(/* @__PURE__ */ new Set());
  const completionShownRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const messageShownRef = useRef(/* @__PURE__ */ new Set());
  const burstArrivedCountRef = useRef(0);
  const burstTotalCountRef = useRef(0);
  const ackSentForBurstRef = useRef(false);
  const flyingSegmentsRef = useRef([]);
  const ackPulsesRef = useRef([]);
  const serverFlashRef = useRef(0);
  const gearRotationRef = useRef(0);
  const frozenRef = useRef(false);
  const persistTimerStartRef = useRef(0);
  const persistTimerProgressRef = useRef(0);
  const probePositionRef = useRef(-1);
  const probeAckPositionRef = useRef(-1);
  const probeAckRwndRef = useRef(0);
  const probeSentCountRef = useRef(0);
  const win0AckSentRef = useRef(false);
  const clearBufferRef = useRef(0);
  const thawFlashRef = useRef(0);
  const frozenAtOffsetRef = useRef(0);
  const drainMsgSentRef = useRef(false);
  const simulateFullBufferRef = useRef(false);
  const zwpTriggeredRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    simulateFullBufferRef.current = simulateFullBuffer;
  }, [simulateFullBuffer]);
  useEffect(() => {
    if (clearBuffer === 0) return;
    clearBufferRef.current = clearBuffer;
  }, [clearBuffer]);
  useEffect(() => {
    const resetAll = () => {
      timeRef.current = 0;
      phaseRef.current = "idle";
      windowSizeRef.current = INITIAL_WINDOW_SIZE;
      windowOffsetRef.current = 0;
      bufferLevelRef.current = 0;
      sentSegmentsRef.current = /* @__PURE__ */ new Set();
      completionShownRef.current = false;
      pauseUntilRef.current = 0;
      messageShownRef.current.clear();
      burstArrivedCountRef.current = 0;
      burstTotalCountRef.current = 0;
      ackSentForBurstRef.current = false;
      flyingSegmentsRef.current = [];
      ackPulsesRef.current = [];
      serverFlashRef.current = 0;
      gearRotationRef.current = 0;
      frozenRef.current = false;
      persistTimerStartRef.current = 0;
      persistTimerProgressRef.current = 0;
      probePositionRef.current = -1;
      probeAckPositionRef.current = -1;
      probeAckRwndRef.current = 0;
      probeSentCountRef.current = 0;
      win0AckSentRef.current = false;
      clearBufferRef.current = 0;
      thawFlashRef.current = 0;
      frozenAtOffsetRef.current = 0;
      drainMsgSentRef.current = false;
      simulateFullBufferRef.current = false;
      zwpTriggeredRef.current = false;
      setRenderState({
        time: 0,
        windowSize: INITIAL_WINDOW_SIZE,
        windowOffset: 0,
        bufferLevel: 0,
        sentSegments: /* @__PURE__ */ new Set(),
        flyingSegments: [],
        ackPulses: [],
        serverFlash: 0,
        gearRotation: 0,
        frozen: false,
        persistTimerProgress: 0,
        probePosition: -1,
        probeAckPosition: -1,
        probeAckRwnd: 0,
        thawFlash: 0,
        frozenAtOffset: 0
      });
    };
    queueMicrotask(resetAll);
  }, [resetTrigger]);
  useFrame((_, delta) => {
    timeRef.current += delta;
    const now2 = timeRef.current;
    if (!isRunning) {
      setRenderState((prev) => prev.time === now2 ? prev : { ...prev, time: now2 });
      return;
    }
    const phase = phaseRef.current;
    const sendMsg = (key, text) => {
      if (onMessageRef.current && !messageShownRef.current.has(key)) {
        messageShownRef.current.add(key);
        onMessageRef.current(text);
      }
    };
    if (phase === "idle" && !frozenRef.current) {
      const wSize = windowSizeRef.current;
      const wOffset = windowOffsetRef.current;
      const sent = sentSegmentsRef.current;
      const newFlying = [];
      const newSent = new Set(sent);
      let count = 0;
      for (let i = 0; i < wSize; i++) {
        const segIdx = wOffset + i;
        if (segIdx >= TOTAL_SEGMENTS || newSent.has(segIdx)) continue;
        newSent.add(segIdx);
        newFlying.push({
          id: `fly-${segIdx}-${now2}`,
          segmentIndex: segIdx,
          position: 0,
          spawnTime: now2 + i * SEGMENT_STAGGER,
          arrived: false,
          arrivalTime: 0
        });
        count++;
      }
      if (count === 0) {
        phaseRef.current = "complete";
      } else {
        phaseRef.current = "sending";
        burstTotalCountRef.current = count;
        burstArrivedCountRef.current = 0;
        ackSentForBurstRef.current = false;
        sentSegmentsRef.current = newSent;
        flyingSegmentsRef.current = [...flyingSegmentsRef.current, ...newFlying];
        const key = `burst-${wOffset}`;
        if (wSize >= 4) {
          sendMsg(key, `\xF0\u0178\u201C\xA4 [CLIENT] High Throughput: Sending ${count} segments (Window: ${wSize})`);
        } else if (wSize === 1) {
          sendMsg(key, `\xF0\u0178\u201C\xA4 [CLIENT] Flow Control Active: Sending 1 segment (Window throttled to 1)`);
        } else {
          sendMsg(key, `\xF0\u0178\u201C\xA4 [CLIENT] Sending ${count} segments (Window: ${wSize})`);
        }
      }
      return;
    }
    let arrivalsThisTick = 0;
    const segs = flyingSegmentsRef.current;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (seg.arrived || now2 < seg.spawnTime) continue;
      const newPos = Math.min(seg.position + SEGMENT_TRAVEL_SPEED, 1);
      if (newPos >= 0.98 && !seg.arrived) {
        arrivalsThisTick++;
        segs[i] = { ...seg, position: 1, arrived: true, arrivalTime: now2 };
      } else {
        segs[i] = { ...seg, position: newPos };
      }
    }
    if (arrivalsThisTick > 0) {
      serverFlashRef.current = 1;
      burstArrivedCountRef.current += arrivalsThisTick;
      const fillAmount = simulateFullBufferRef.current && !zwpTriggeredRef.current ? 0.25 : FILL_PER_SEGMENT;
      for (let a = 0; a < arrivalsThisTick; a++) {
        bufferLevelRef.current = Math.min(bufferLevelRef.current + fillAmount, 1);
      }
      const bl = bufferLevelRef.current;
      if (bl >= 0.8) sendMsg("buffer-warn", "\u26A0\uFE0F [SERVER] Buffer at 80%+! Pressure building \u2014 sending throttle signal...");
      if (bl >= 1) sendMsg("buffer-full", "\u{1F534} [SERVER] Buffer FULL (100%)! Maximum backpressure!");
    }
    flyingSegmentsRef.current = segs.filter((seg) => !(seg.arrived && now2 - seg.arrivalTime > 0.5));
    if (phase === "sending" && burstArrivedCountRef.current >= burstTotalCountRef.current && burstTotalCountRef.current > 0 && !ackSentForBurstRef.current) {
      ackSentForBurstRef.current = true;
      if (simulateFullBufferRef.current && !zwpTriggeredRef.current && bufferLevelRef.current >= 0.9) {
        zwpTriggeredRef.current = true;
        phaseRef.current = "ack-traveling";
        ackPulsesRef.current = [...ackPulsesRef.current, {
          id: `ack-win0-${now2}`,
          position: 1,
          rwnd: 0,
          spawnTime: now2 + 0.3,
          arrived: false,
          arrivalTime: 0,
          isWin0: true
        }];
        sendMsg("ack-zwp-trigger", "\u{1F534} [SERVER] Buffer CRITICALLY FULL! Sending ACK with WIN: 0 \u2014 Sender must STOP!");
      } else {
        phaseRef.current = "ack-traveling";
        const currentBufferSegments = Math.round(bufferLevelRef.current * BUFFER_CAPACITY);
        const rwnd = Math.max(1, Math.min(INITIAL_WINDOW_SIZE, BUFFER_CAPACITY - currentBufferSegments));
        ackPulsesRef.current = [...ackPulsesRef.current, {
          id: `ack-${now2}`,
          position: 1,
          rwnd,
          spawnTime: now2 + 0.3,
          arrived: false,
          arrivalTime: 0
        }];
        const key = `ack-${windowOffsetRef.current}`;
        if (rwnd <= 1) {
          sendMsg(key, "\u{1F7E1} [SERVER] Sending ACK \u2192 WIN: " + rwnd + " (Buffer under pressure \u2014 throttling sender!)");
        } else if (rwnd >= INITIAL_WINDOW_SIZE) {
          sendMsg(key, "\u{1F7E2} [SERVER] Sending ACK \u2192 WIN: " + rwnd + " (Buffer clear \u2014 full speed ahead!)");
        } else {
          sendMsg(key, "\u{1F7E1} [SERVER] Sending ACK \u2192 WIN: " + rwnd + " (Buffer partially full)");
        }
      }
    }
    let arrivedAck = null;
    const acks = ackPulsesRef.current;
    for (let i = 0; i < acks.length; i++) {
      const ack = acks[i];
      if (ack.arrived || now2 < ack.spawnTime) continue;
      const newPos = Math.max(ack.position - ACK_TRAVEL_SPEED, 0);
      if (newPos <= 0.02 && !ack.arrived) {
        arrivedAck = ack;
        acks[i] = { ...ack, position: 0, arrived: true, arrivalTime: now2 };
      } else {
        acks[i] = { ...ack, position: newPos };
      }
    }
    if (arrivedAck) {
      if (arrivedAck.rwnd === 0) {
        frozenRef.current = true;
        windowSizeRef.current = 0;
        phaseRef.current = "frozen";
        persistTimerStartRef.current = 0;
        persistTimerProgressRef.current = 0;
        probePositionRef.current = -1;
        probeAckPositionRef.current = -1;
        frozenAtOffsetRef.current = windowOffsetRef.current;
        sendMsg("window-zero", "\u26D4 [CLIENT] ACK received: WIN: 0 \u2014 Window LOCKED! Transmission FROZEN. Waiting...");
      } else {
        const newWinSize = arrivedAck.rwnd;
        const oldWinSize = windowSizeRef.current;
        const oldOffset = windowOffsetRef.current;
        const sent = sentSegmentsRef.current;
        const rKey = `resize-${oldOffset}-${newWinSize}`;
        if (newWinSize < oldWinSize) {
          sendMsg(rKey, `\xE2\xAC\u2021\xEF\xB8\x8F [CLIENT] ACK received \xE2\u2020\u2019 Window SHRINKS: ${oldWinSize} \xE2\u2020\u2019 ${newWinSize} (Flow Control: Slow Down!)`);
        } else if (newWinSize > oldWinSize) {
          sendMsg(rKey, `\xE2\xAC\u2020\xEF\xB8\x8F [CLIENT] ACK received \xE2\u2020\u2019 Window EXPANDS: ${oldWinSize} \xE2\u2020\u2019 ${newWinSize} (Recovery: Speed Up!)`);
        } else {
          sendMsg(rKey, `\xE2\u2020\u201D\xEF\xB8\x8F [CLIENT] ACK received \xE2\u2020\u2019 Window stays at ${newWinSize}`);
        }
        windowSizeRef.current = newWinSize;
        let newOffset = oldOffset;
        while (newOffset < TOTAL_SEGMENTS && sent.has(newOffset)) {
          newOffset++;
        }
        windowOffsetRef.current = newOffset;
        if (newOffset >= TOTAL_SEGMENTS) {
          phaseRef.current = "complete";
        } else {
          phaseRef.current = "pause";
          pauseUntilRef.current = now2 + POST_ACK_PAUSE;
        }
      }
    }
    ackPulsesRef.current = acks.filter((ack) => !(ack.arrived && now2 - ack.arrivalTime > 0.5));
    if (phase === "pause" && now2 >= pauseUntilRef.current) {
      phaseRef.current = "idle";
    }
    if (phase === "complete" && !completionShownRef.current) {
      completionShownRef.current = true;
      if (onMessageRef.current) onMessageRef.current(`\u2705 [COMPLETE] All ${TOTAL_SEGMENTS} segments successfully transmitted via Flow Control!`);
    }
    if (bufferLevelRef.current > 0) {
      if (!frozenRef.current) {
        const effectiveDrain = simulateFullBufferRef.current && !zwpTriggeredRef.current ? drainSpeed * 0.5 : drainSpeed;
        gearRotationRef.current += delta * 2 * effectiveDrain;
        const drainAmount = 0.2 * effectiveDrain * delta;
        bufferLevelRef.current = Math.max(bufferLevelRef.current - drainAmount, 0);
      } else {
        gearRotationRef.current += delta * 1.5;
        if (probePositionRef.current >= 0) {
          const fastDrain = 0.8 * delta;
          bufferLevelRef.current = Math.max(bufferLevelRef.current - fastDrain, 0);
        } else {
          const bgDrain = 0.15 * delta;
          bufferLevelRef.current = Math.max(bufferLevelRef.current - bgDrain, 0);
        }
      }
    }
    if (frozenRef.current) {
      if (clearBufferRef.current > 0) {
        clearBufferRef.current = 0;
        bufferLevelRef.current = 0;
        sendMsg("buffer-cleared", "\u2705 [SERVER] Buffer cleared! Processing complete. Sending Window Update...");
      }
      if (persistTimerStartRef.current === 0) {
        persistTimerStartRef.current = now2;
      }
      const elapsed = now2 - persistTimerStartRef.current;
      persistTimerProgressRef.current = Math.min(elapsed / 3, 1);
      if (!drainMsgSentRef.current && bufferLevelRef.current < 0.9) {
        drainMsgSentRef.current = true;
        sendMsg("drain-backlog", "\u2699\uFE0F [SERVER] Processing backlog... buffer draining.");
      }
      if (persistTimerProgressRef.current < 1) {
        const probeNum = probeSentCountRef.current + 1;
        if (probeNum === 1) {
          sendMsg("persist-timer", "\u23F1\uFE0F [CLIENT] Receiver busy. Starting Persist Timer...");
        } else {
          sendMsg("persist-timer-" + probeNum, "\u23F1\uFE0F [CLIENT] No response yet. Persist Timer restarted (Probe #" + probeNum + ")...");
        }
      }
      if (persistTimerProgressRef.current >= 1 && probePositionRef.current < 0 && probeAckPositionRef.current < 0) {
        probePositionRef.current = 0;
        probeSentCountRef.current += 1;
        const probeNum = probeSentCountRef.current;
        sendMsg("probe-sent-" + probeNum, "\u{1F489} [CLIENT] Sending Zero Window Probe #" + probeNum + " (1 Byte) to Server...");
      }
      if (probePositionRef.current >= 0 && probePositionRef.current < 1) {
        probePositionRef.current = Math.min(probePositionRef.current + 0.012, 1);
        if (probePositionRef.current >= 0.98) {
          probePositionRef.current = 1;
          serverFlashRef.current = 1;
          const bufferEmpty = bufferLevelRef.current <= 0.01;
          const rwnd = bufferEmpty ? 2 : 0;
          probeAckRwndRef.current = rwnd;
          probeAckPositionRef.current = 1;
          const ackNum = frozenAtOffsetRef.current + 1;
          if (bufferEmpty) {
            sendMsg("probe-response-recovery-" + probeSentCountRef.current, "\u{1F7E2} [SERVER] Buffer clear! Responding: ACK " + ackNum + " | WIN: " + rwnd + " \u2014 Sender can resume!");
          } else {
            sendMsg("probe-response-full-" + probeSentCountRef.current, "\u{1F534} [SERVER] Buffer still full. Responding: ACK " + ackNum + " | WIN: 0 \u2014 Stay paused!");
          }
        }
      }
      if (probeAckPositionRef.current >= 0) {
        probeAckPositionRef.current = Math.max(probeAckPositionRef.current - 0.014, 0);
        if (probeAckPositionRef.current <= 0.02) {
          const rwnd = probeAckRwndRef.current;
          probeAckPositionRef.current = -1;
          probePositionRef.current = -1;
          if (rwnd > 0) {
            frozenRef.current = false;
            windowSizeRef.current = rwnd;
            thawFlashRef.current = 1;
            drainMsgSentRef.current = false;
            let newOffset = windowOffsetRef.current;
            while (newOffset < TOTAL_SEGMENTS && sentSegmentsRef.current.has(newOffset)) {
              newOffset++;
            }
            windowOffsetRef.current = newOffset;
            if (newOffset >= TOTAL_SEGMENTS) {
              phaseRef.current = "complete";
            } else {
              phaseRef.current = "pause";
              pauseUntilRef.current = now2 + POST_ACK_PAUSE;
            }
            sendMsg("thaw", "\u{1F7E2} [CLIENT] Window REOPENED: 0 \u2192 " + rwnd + "! Resuming transmission!");
          } else {
            persistTimerStartRef.current = 0;
            persistTimerProgressRef.current = 0;
            sendMsg("still-frozen-" + probeSentCountRef.current, "\u26A0\uFE0F [CLIENT] Window still 0. Restarting Persist Timer...");
          }
        }
      }
    }
    if (serverFlashRef.current > 0) {
      serverFlashRef.current = Math.max(serverFlashRef.current - delta * 2.5, 0);
    }
    if (thawFlashRef.current > 0) {
      thawFlashRef.current = Math.max(thawFlashRef.current - delta * 1.2, 0);
    }
    setRenderState({
      time: now2,
      windowSize: windowSizeRef.current,
      windowOffset: windowOffsetRef.current,
      bufferLevel: bufferLevelRef.current,
      sentSegments: sentSegmentsRef.current,
      flyingSegments: [...flyingSegmentsRef.current],
      ackPulses: [...ackPulsesRef.current],
      serverFlash: serverFlashRef.current,
      gearRotation: gearRotationRef.current,
      frozen: frozenRef.current,
      persistTimerProgress: persistTimerProgressRef.current,
      probePosition: probePositionRef.current,
      probeAckPosition: probeAckPositionRef.current,
      probeAckRwnd: probeAckRwndRef.current,
      thawFlash: thawFlashRef.current,
      frozenAtOffset: frozenAtOffsetRef.current
    });
  });
  const getSegmentX = (index) => QUEUE_START_X + index * SEGMENT_STRIDE;
  const {
    time: now,
    windowSize,
    windowOffset,
    bufferLevel,
    sentSegments,
    flyingSegments: flySegs,
    ackPulses: ackList,
    serverFlash,
    frozen,
    persistTimerProgress,
    probePosition,
    probeAckPosition,
    probeAckRwnd,
    thawFlash,
    frozenAtOffset
  } = renderState;
  const windowCenterX = getSegmentX(windowOffset) + (windowSize - 1) * SEGMENT_STRIDE / 2;
  const windowWidth = windowSize * SEGMENT_STRIDE;
  const cableMidX = (CLIENT_X + SERVER_X) / 2;
  const cableLength = SERVER_X - CLIENT_X;
  return /* @__PURE__ */ jsxs("group", { ref: groupRef, position: [-1, 0, 0], children: [
    /* @__PURE__ */ jsxs("group", { position: [CLIENT_X, 0, 0], children: [
      /* @__PURE__ */ jsxs("mesh", { children: [
        /* @__PURE__ */ jsx("boxGeometry", { args: [0.8, 0.8, 0.8] }),
        /* @__PURE__ */ jsx(
          "meshPhongMaterial",
          {
            color: frozen ? "#ff4444" : "#00ffff",
            emissive: frozen ? "#ff2222" : "#00ffff",
            emissiveIntensity: frozen ? 0.4 + Math.sin(now * 3) * 0.3 : 0.6,
            shininess: 80
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("mesh", { position: [0, -0.55, 0], rotation: [Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsx("torusGeometry", { args: [0.6, 0.06, 16, 32] }),
        /* @__PURE__ */ jsx("meshBasicMaterial", { color: frozen ? "#ff4444" : "#00ffff", transparent: true, opacity: 0.8 })
      ] }),
      /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 2, distance: 2.5, color: frozen ? "#ff4444" : "#00ffff" }),
      frozen && /* @__PURE__ */ jsx("pointLight", { position: [0, 0.5, 0.5], intensity: 3 + Math.sin(now * 3) * 1.5, distance: 3, color: "#ff3333" }),
      /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, -1, 0],
          fontSize: 0.35,
          color: frozen ? "#ff6666" : "#00ffff",
          anchorX: "center",
          anchorY: "top",
          fontWeight: "bold",
          children: "SENDER"
        }
      ),
      frozen && /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, 0.7, 0.5],
          fontSize: 0.18,
          color: "#ff4444",
          anchorX: "center",
          anchorY: "center",
          fontWeight: "bold",
          children: "FROZEN"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("group", { position: [SERVER_X, 0, 0], children: [
      /* @__PURE__ */ jsxs("mesh", { children: [
        /* @__PURE__ */ jsx("boxGeometry", { args: [0.8, 0.8, 0.8] }),
        /* @__PURE__ */ jsx(
          "meshPhongMaterial",
          {
            color: serverFlash > 0 ? "#22ff00" : "#ffaa00",
            emissive: serverFlash > 0 ? "#22ff00" : "#ffaa00",
            emissiveIntensity: 0.6 + serverFlash * 2,
            shininess: 80
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("mesh", { position: [0, -0.55, 0], rotation: [Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsx("torusGeometry", { args: [0.6, 0.06, 16, 32] }),
        /* @__PURE__ */ jsx("meshBasicMaterial", { color: serverFlash > 0 ? "#22ff00" : "#ffaa00", transparent: true, opacity: 0.8 })
      ] }),
      /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 2, distance: 2.5, color: "#ffaa00" }),
      serverFlash > 0 && /* @__PURE__ */ jsx("pointLight", { position: [0, 0.5, 0.8], intensity: 8 * serverFlash, distance: 6, color: "#22ff00" }),
      /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, -1, 0],
          fontSize: 0.35,
          color: serverFlash > 0 ? "#ccffcc" : "#ffdd00",
          anchorX: "center",
          anchorY: "top",
          fontWeight: "bold",
          children: "RECEIVER"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("group", { children: [
      /* @__PURE__ */ jsxs("mesh", { position: [cableMidX, 0, 0], rotation: [0, 0, Math.PI / 2], children: [
        /* @__PURE__ */ jsx("cylinderGeometry", { args: [0.06, 0.06, cableLength, 32] }),
        /* @__PURE__ */ jsx(
          "meshPhongMaterial",
          {
            color: "#00ffff",
            emissive: "#00ffff",
            emissiveIntensity: 0.8
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("mesh", { position: [cableMidX, 0.03, 0], rotation: [0, 0, Math.PI / 2], children: [
        /* @__PURE__ */ jsx("cylinderGeometry", { args: [0.11, 0.11, cableLength, 32] }),
        /* @__PURE__ */ jsx(
          "meshPhongMaterial",
          {
            color: "#0099dd",
            emissive: "#0099dd",
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.5
          }
        )
      ] }),
      /* @__PURE__ */ jsx("pointLight", { position: [cableMidX, 0, 0], intensity: 1.5, distance: 4, color: "#00ffff" })
    ] }),
    /* @__PURE__ */ jsxs("mesh", { position: [CLIENT_X, (0.4 + QUEUE_Y) / 2, 0], children: [
      /* @__PURE__ */ jsx("cylinderGeometry", { args: [0.02, 0.02, QUEUE_Y - 0.55, 8] }),
      /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#00ffff", transparent: true, opacity: 0.3 })
    ] }),
    Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
      const x = getSegmentX(i);
      const isInWindow = i >= windowOffset && i < windowOffset + windowSize && !sentSegments.has(i);
      const isSent = sentSegments.has(i);
      const pulse = isInWindow ? Math.sin(now * 3 + i * 0.5) * 0.15 + 0.85 : 1;
      return /* @__PURE__ */ jsxs("group", { position: [x, QUEUE_Y, 0], children: [
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("boxGeometry", { args: [SEGMENT_SIZE, SEGMENT_SIZE, SEGMENT_SIZE] }),
          /* @__PURE__ */ jsx(
            "meshPhongMaterial",
            {
              color: isSent ? "#1e293b" : isInWindow ? "#00eeff" : "#3b82f6",
              emissive: isSent ? "#0f172a" : isInWindow ? "#00bbdd" : "#1e3a8a",
              emissiveIntensity: isSent ? 0.1 : isInWindow ? 0.8 * pulse : 0.3,
              shininess: isInWindow ? 100 : 40,
              transparent: isSent,
              opacity: isSent ? 0.25 : 1
            }
          )
        ] }),
        isInWindow && /* @__PURE__ */ jsx(
          "pointLight",
          {
            position: [0, 0, 0],
            intensity: 1.2 * pulse,
            distance: 0.5,
            color: "#00eeff"
          }
        ),
        /* @__PURE__ */ jsx(
          Text,
          {
            position: [0, 0, SEGMENT_SIZE / 2 + 0.01],
            fontSize: 0.08,
            color: isSent ? "#334155" : isInWindow ? "#ffffff" : "#94a3b8",
            anchorX: "center",
            anchorY: "center",
            fontWeight: "bold",
            children: i + 1
          }
        )
      ] }, `seg-${i}`);
    }),
    /* @__PURE__ */ jsxs("group", { position: [windowCenterX, QUEUE_Y, 0], children: [
      /* @__PURE__ */ jsxs("mesh", { children: [
        /* @__PURE__ */ jsx("boxGeometry", { args: [frozen ? 0.5 : windowWidth, 0.42, 0.42] }),
        /* @__PURE__ */ jsx(
          "meshBasicMaterial",
          {
            color: frozen ? "#ff3333" : thawFlash > 0.3 ? "#ffdd00" : "#00ffff",
            wireframe: true,
            transparent: true,
            opacity: frozen ? 0.8 + Math.sin(now * 4) * 0.2 : thawFlash > 0 ? 0.9 : 0.6 + Math.sin(now * 2) * 0.15
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("mesh", { children: [
        /* @__PURE__ */ jsx("boxGeometry", { args: [(frozen ? 0.5 : windowWidth) + 0.04, 0.46, 0.46] }),
        /* @__PURE__ */ jsx(
          "meshBasicMaterial",
          {
            color: frozen ? "#ff5555" : thawFlash > 0.3 ? "#ffee44" : "#00ddff",
            wireframe: true,
            transparent: true,
            opacity: frozen ? 0.4 + Math.sin(now * 4) * 0.15 : thawFlash > 0 ? 0.6 : 0.2 + Math.sin(now * 2) * 0.08
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, 0.4, 0],
          fontSize: 0.14,
          color: frozen ? "#ff4444" : thawFlash > 0.3 ? "#ffdd00" : "#00ffff",
          anchorX: "center",
          anchorY: "bottom",
          fontWeight: "bold",
          children: frozen ? "WINDOW LOCKED (WIN: 0)" : thawFlash > 0.3 ? `WINDOW REOPENED! (rwnd: ${windowSize})` : `WINDOW (rwnd: ${windowSize})`
        }
      ),
      /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0.4], intensity: thawFlash > 0 ? 3 : 1.2, distance: 1.8, color: frozen ? "#ff3333" : thawFlash > 0.3 ? "#ffdd00" : "#00eeff" }),
      thawFlash > 0 && /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 5 * thawFlash, distance: 3, color: "#ffdd00" }),
      frozen && /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 2 + Math.sin(now * 4) * 1, distance: 2.5, color: "#ff3333" })
    ] }),
    /* @__PURE__ */ jsxs("group", { position: [SERVER_X + 1.3, 0, 0], children: [
      /* @__PURE__ */ jsxs("mesh", { children: [
        /* @__PURE__ */ jsx("cylinderGeometry", { args: [TANK_RADIUS, TANK_RADIUS, TANK_HEIGHT, 32] }),
        /* @__PURE__ */ jsx(
          "meshPhongMaterial",
          {
            color: "#60a5fa",
            transparent: true,
            opacity: 0.1,
            depthWrite: false
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("mesh", { children: [
        /* @__PURE__ */ jsx("cylinderGeometry", { args: [TANK_RADIUS + 0.01, TANK_RADIUS + 0.01, TANK_HEIGHT, 16] }),
        /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#3b82f6", wireframe: true, transparent: true, opacity: 0.25 })
      ] }),
      /* @__PURE__ */ jsxs("mesh", { position: [0, TANK_HEIGHT / 2, 0], rotation: [Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsx("torusGeometry", { args: [TANK_RADIUS, 0.03, 8, 32] }),
        /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#60a5fa", transparent: true, opacity: 0.8 })
      ] }),
      /* @__PURE__ */ jsxs("mesh", { position: [0, -TANK_HEIGHT / 2, 0], rotation: [Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsx("torusGeometry", { args: [TANK_RADIUS, 0.03, 8, 32] }),
        /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#60a5fa", transparent: true, opacity: 0.8 })
      ] }),
      /* @__PURE__ */ jsxs("mesh", { position: [0, -TANK_HEIGHT / 2, 0], rotation: [-Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsx("circleGeometry", { args: [TANK_RADIUS, 32] }),
        /* @__PURE__ */ jsx("meshPhongMaterial", { color: "#1e3a8a", transparent: true, opacity: 0.3 })
      ] }),
      bufferLevel > 0.01 && (() => {
        const liquidColor = bufferLevel > 0.7 ? "#ff4444" : bufferLevel > 0.4 ? "#ffaa00" : "#00ff88";
        const liquidEmissive = bufferLevel > 0.7 ? "#ff2222" : bufferLevel > 0.4 ? "#ff8800" : "#00dd66";
        return /* @__PURE__ */ jsxs("mesh", { position: [0, -TANK_HEIGHT / 2 + bufferLevel * TANK_HEIGHT / 2, 0], children: [
          /* @__PURE__ */ jsx("cylinderGeometry", { args: [TANK_RADIUS - 0.04, TANK_RADIUS - 0.04, bufferLevel * TANK_HEIGHT, 32] }),
          /* @__PURE__ */ jsx(
            "meshPhongMaterial",
            {
              color: liquidColor,
              emissive: liquidEmissive,
              emissiveIntensity: 0.5 + bufferLevel * 0.3,
              transparent: true,
              opacity: 0.6
            }
          )
        ] });
      })(),
      /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, TANK_HEIGHT / 2 + 0.2, 0],
          fontSize: 0.13,
          color: "#60a5fa",
          anchorX: "center",
          anchorY: "bottom",
          fontWeight: "bold",
          children: "RECEIVE BUFFER"
        }
      ),
      /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, 0, TANK_RADIUS + 0.12],
          fontSize: 0.13,
          color: bufferLevel > 0.7 ? "#ff4444" : bufferLevel > 0.4 ? "#ffaa00" : "#94a3b8",
          anchorX: "center",
          anchorY: "center",
          fontWeight: "bold",
          children: `${Math.round(bufferLevel * 100)}%`
        }
      ),
      frozen && bufferLevel >= 0.99 && /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, -TANK_HEIGHT / 2 - 0.2, 0],
          fontSize: 0.11,
          color: "#ff4444",
          anchorX: "center",
          anchorY: "top",
          fontWeight: "bold",
          children: "FULL!"
        }
      ),
      frozen && probePosition >= 0 && bufferLevel < 0.99 && bufferLevel > 0.01 && /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, -TANK_HEIGHT / 2 - 0.2, 0],
          fontSize: 0.11,
          color: "#ffaa00",
          anchorX: "center",
          anchorY: "top",
          fontWeight: "bold",
          children: "DRAINING..."
        }
      )
    ] }),
    flySegs.filter((seg) => now >= seg.spawnTime).map((seg) => {
      const startX = getSegmentX(seg.segmentIndex);
      const startY = QUEUE_Y;
      const endX = SERVER_X;
      const endY = 0.5;
      const t = seg.position;
      const x = startX + (endX - startX) * t;
      const arcHeight = 0.8;
      const y = startY + (endY - startY) * t + Math.sin(t * Math.PI) * arcHeight;
      const arrivalFade = seg.arrived ? Math.max(0, 1 - (now - seg.arrivalTime) / 0.5) : 1;
      return /* @__PURE__ */ jsxs("group", { position: [x, y, 0], children: [
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("boxGeometry", { args: [SEGMENT_SIZE, SEGMENT_SIZE, SEGMENT_SIZE] }),
          /* @__PURE__ */ jsx(
            "meshPhongMaterial",
            {
              color: "#00eeff",
              emissive: "#00bbdd",
              emissiveIntensity: 1,
              shininess: 100,
              transparent: true,
              opacity: arrivalFade
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("boxGeometry", { args: [SEGMENT_SIZE + 0.03, SEGMENT_SIZE + 0.03, SEGMENT_SIZE + 0.03] }),
          /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#00ffff", wireframe: true, transparent: true, opacity: 0.5 * arrivalFade })
        ] }),
        arrivalFade > 0.3 && /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 2 * arrivalFade, distance: 1, color: "#00eeff" }),
        /* @__PURE__ */ jsx(
          Text,
          {
            position: [0, SEGMENT_SIZE / 2 + 0.08, 0],
            fontSize: 0.08,
            color: "#ffffff",
            anchorX: "center",
            anchorY: "bottom",
            fontWeight: "bold",
            fillOpacity: arrivalFade,
            children: seg.segmentIndex + 1
          }
        )
      ] }, seg.id);
    }),
    ackList.filter((ack) => now >= ack.spawnTime).map((ack) => {
      const x = CLIENT_X + ack.position * (SERVER_X - CLIENT_X);
      const y = -0.5;
      const arrivalFade = ack.arrived ? Math.max(0, 1 - (now - ack.arrivalTime) / 0.5) : 1;
      const pulse = Math.sin(now * 4) * 0.3 + 0.7;
      const isWin0 = ack.isWin0 || ack.rwnd === 0;
      const ackColor = isWin0 ? "#ff4444" : "#ffcc00";
      const ackEmissive = isWin0 ? "#ff2222" : "#ffaa00";
      const ackGlowColor = isWin0 ? "#ff5555" : "#ffdd00";
      const ackLabelColor = isWin0 ? "#ff6666" : "#ffdd00";
      return /* @__PURE__ */ jsxs("group", { position: [x, y, 0], children: [
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [0.3, 32, 32] }),
          /* @__PURE__ */ jsx(
            "meshPhongMaterial",
            {
              color: ackColor,
              emissive: ackEmissive,
              emissiveIntensity: 1 * pulse,
              shininess: 100,
              transparent: true,
              opacity: arrivalFade
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [0.45, 32, 32] }),
          /* @__PURE__ */ jsx(
            "meshBasicMaterial",
            {
              color: ackGlowColor,
              wireframe: true,
              transparent: true,
              opacity: 0.4 * pulse * arrivalFade
            }
          )
        ] }),
        /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 4 * pulse * arrivalFade, distance: 3, color: ackColor }),
        /* @__PURE__ */ jsx(
          Text,
          {
            position: [0, -0.55, 0],
            fontSize: 0.16,
            color: ackLabelColor,
            anchorX: "center",
            anchorY: "top",
            fontWeight: "bold",
            fillOpacity: arrivalFade,
            children: isWin0 ? "WIN: 0 (STOP!)" : `WIN: ${ack.rwnd}`
          }
        )
      ] }, ack.id);
    }),
    frozen && persistTimerProgress > 0 && persistTimerProgress < 1 && /* @__PURE__ */ jsxs("group", { position: [CLIENT_X, 1.8, 0], children: [
      /* @__PURE__ */ jsxs("mesh", { rotation: [Math.PI / 2, 0, 0], children: [
        /* @__PURE__ */ jsx("torusGeometry", { args: [0.45, 0.06, 16, 64] }),
        /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#ff4444", transparent: true, opacity: 0.2 })
      ] }),
      /* @__PURE__ */ jsxs("mesh", { rotation: [Math.PI / 2, 0, Math.PI * 2 * persistTimerProgress], children: [
        /* @__PURE__ */ jsx("torusGeometry", { args: [0.45, 0.06, 16, 64, 0, Math.PI * 2 * persistTimerProgress] }),
        /* @__PURE__ */ jsx(
          "meshBasicMaterial",
          {
            color: persistTimerProgress > 0.7 ? "#ffaa00" : "#ff6644",
            transparent: true,
            opacity: 0.9
          }
        )
      ] }),
      /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 1.5 + persistTimerProgress * 2, distance: 2, color: "#ff6644" }),
      /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, 0, 0.3],
          fontSize: 0.14,
          color: "#ffaa00",
          anchorX: "center",
          anchorY: "center",
          fontWeight: "bold",
          children: `${Math.round((1 - persistTimerProgress) * 3)}s`
        }
      ),
      /* @__PURE__ */ jsx(
        Text,
        {
          position: [0, -0.65, 0],
          fontSize: 0.1,
          color: "#ff8866",
          anchorX: "center",
          anchorY: "center",
          children: "PERSIST TIMER"
        }
      )
    ] }),
    probePosition >= 0 && probePosition <= 1 && (() => {
      const px = CLIENT_X + probePosition * (SERVER_X - CLIENT_X);
      const py = 0.4;
      const probePulse = Math.sin(now * 6) * 0.3 + 0.7;
      return /* @__PURE__ */ jsxs("group", { position: [px, py, 0], children: [
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [0.15, 16, 16] }),
          /* @__PURE__ */ jsx(
            "meshPhongMaterial",
            {
              color: "#ffcc00",
              emissive: "#ffaa00",
              emissiveIntensity: 1.2 * probePulse,
              shininess: 100
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [0.22, 16, 16] }),
          /* @__PURE__ */ jsx("meshBasicMaterial", { color: "#ffdd00", wireframe: true, transparent: true, opacity: 0.5 * probePulse })
        ] }),
        /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 3 * probePulse, distance: 2, color: "#ffcc00" }),
        /* @__PURE__ */ jsx(
          Text,
          {
            position: [0, 0.35, 0],
            fontSize: 0.1,
            color: "#ffdd00",
            anchorX: "center",
            anchorY: "center",
            fontWeight: "bold",
            children: "PROBE (1 Byte)"
          }
        )
      ] });
    })(),
    probeAckPosition >= 0 && probeAckPosition <= 1 && (() => {
      const ax = CLIENT_X + probeAckPosition * (SERVER_X - CLIENT_X);
      const ay = -0.5;
      const isRecovery = probeAckRwnd > 0;
      const ackColor = isRecovery ? "#00ff66" : "#ff4444";
      const ackEmissive = isRecovery ? "#00dd44" : "#ff2222";
      const ackPulse = Math.sin(now * 4) * 0.3 + 0.7;
      return /* @__PURE__ */ jsxs("group", { position: [ax, ay, 0], children: [
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [0.3, 32, 32] }),
          /* @__PURE__ */ jsx(
            "meshPhongMaterial",
            {
              color: ackColor,
              emissive: ackEmissive,
              emissiveIntensity: 1 * ackPulse,
              shininess: 100
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("mesh", { children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [0.45, 32, 32] }),
          /* @__PURE__ */ jsx("meshBasicMaterial", { color: ackColor, wireframe: true, transparent: true, opacity: 0.4 * ackPulse })
        ] }),
        /* @__PURE__ */ jsx("pointLight", { position: [0, 0, 0], intensity: 4 * ackPulse, distance: 3, color: ackColor }),
        /* @__PURE__ */ jsx(
          Text,
          {
            position: [0, -0.55, 0],
            fontSize: 0.14,
            color: ackColor,
            anchorX: "center",
            anchorY: "top",
            fontWeight: "bold",
            children: isRecovery ? `ACK ${frozenAtOffset + 1} | WIN: ${probeAckRwnd}` : `ACK ${frozenAtOffset + 1} | WIN: 0`
          }
        )
      ] });
    })(),
    /* @__PURE__ */ jsx(
      Text,
      {
        position: [(getSegmentX(0) + getSegmentX(TOTAL_SEGMENTS - 1)) / 2, QUEUE_Y - 0.35, 0],
        fontSize: 0.11,
        color: "#64748b",
        anchorX: "center",
        anchorY: "top",
        children: "Data Segments (1-20)"
      }
    )
  ] });
}
export {
  FlowControlViz as default
};
