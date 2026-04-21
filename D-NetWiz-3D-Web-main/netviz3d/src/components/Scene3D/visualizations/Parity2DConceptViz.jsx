

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// ─────────────────────────────────────────────
//  Constants (reuse from ChecksumConceptViz)
// ─────────────────────────────────────────────
const MIN_PCS = 2;
const MAX_PCS = 8;
const BIT_WIDTH = 8;
const DEFAULT_BITSTREAM = '1011000101110010';

const LINK_COLORS = {
	tube: '#002244',
	emissive: '#0066cc',
};

function generateMacAddress() {
	const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
	bytes[0] = (bytes[0] | 0x02) & 0xfe;
	return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
}
function isValidMac(mac) {
	return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac.trim());
}
function uniqueMacList(count) {
	const unique = new Set();
	while (unique.size < count) unique.add(generateMacAddress());
	return Array.from(unique);
}
function makePairKey(a, b) {
	return [a, b].sort().join('|');
}
function curveBetween(start, end) {
	const s = new THREE.Vector3(start[0], start[1], start[2]);
	const e = new THREE.Vector3(end[0], end[1], end[2]);
	const arcHeight = 0.8 + s.distanceTo(e) * 0.08;
	const mid = new THREE.Vector3((s.x + e.x) / 2, Math.max(s.y, e.y) + arcHeight, (s.z + e.z) / 2);
	return new THREE.CatmullRomCurve3([s, mid, e]);
}

// ─────────────────────────────────────────────
//  Placeholder 2D Parity Math Utilities
// ─────────────────────────────────────────────
function build2DParityGrid(bitstream, rows = 4, cols = 4) {
	// Fill grid with bits
	const clean = bitstream.replace(/\s/g, '').padEnd(rows * cols, '0');
	const grid = [];
	for (let r = 0; r < rows; r++) {
		grid.push(clean.slice(r * cols, (r + 1) * cols).split(''));
	}
	// Calculate row parity (even parity)
	const rowParity = grid.map(row => (row.reduce((acc, b) => acc + (b === '1' ? 1 : 0), 0) % 2 === 0 ? '0' : '1'));
	// Calculate column parity (even parity)
	const colParity = [];
	for (let c = 0; c < cols; c++) {
		let ones = 0;
		for (let r = 0; r < rows; r++) {
			if (grid[r][c] === '1') ones++;
		}
		colParity.push(ones % 2 === 0 ? '0' : '1');
	}
	return { grid, rowParity, colParity };
}

function DraggablePanel({ children, title, initialX, initialY, isVisible, onToggle, onDragChange }) {
	const [position, setPosition] = useState({ x: initialX, y: initialY });
	const [isDragging, setIsDragging] = useState(false);
	const dragStart = useRef({ x: 0, y: 0 });
	const handleMouseDown = (e) => {
		if (["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(e.target.tagName)) return;
		setIsDragging(true);
		if (onDragChange) onDragChange(true);
		dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
	};
	const handleMouseMove = (e) => {
		if (!isDragging) return;
		setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
	};
	const handleMouseUp = () => {
		setIsDragging(false);
		if (onDragChange) onDragChange(false);
	};
	useEffect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
			};
		}
		return undefined;
	}, [isDragging]);
	return (
		<div
			style={{ left: position.x, top: position.y }}
			className={`absolute pointer-events-auto rounded-xl border border-amber-400/30 bg-slate-950/82 backdrop-blur-md shadow-[0_12px_45px_rgba(0,0,0,0.45)] ${isDragging ? 'cursor-grabbing' : ''}`}
			onMouseDown={handleMouseDown}
		>
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 cursor-grab">
				<p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/85">{title}</p>
				<button
					type="button"
					onClick={onToggle}
					className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
				>
					{isVisible ? '−' : '+'}
				</button>
			</div>
			{isVisible && <div className="p-4 md:p-5">{children}</div>}
		</div>
	);
}

function NetworkLink({ start, end }) {
	const geometry = useMemo(() => {
		const c = curveBetween(start, end);
		return new THREE.TubeGeometry(c, 48, 0.04, 8, false);
	}, [start, end]);
	useEffect(() => () => geometry.dispose(), [geometry]);
	return (
		<mesh geometry={geometry}>
			<meshStandardMaterial
				color={LINK_COLORS.tube}
				emissive={LINK_COLORS.emissive}
				emissiveIntensity={0.8}
				metalness={0.5}
				roughness={0.35}
				transparent
				opacity={0.9}
			/>
		</mesh>
	);
}

function PCNode({ pc, showSuccess, showError }) {
	return (
		<group position={pc.position}>
			<mesh position={[0, 0.38, 0]}>
				<boxGeometry args={[0.95, 0.62, 0.12]} />
				<meshStandardMaterial color="#0f172a" emissive="#0f172a" emissiveIntensity={0.2} />
			</mesh>
			<mesh position={[0, 0.39, 0.07]}>
				<boxGeometry args={[0.78, 0.47, 0.02]} />
				<meshStandardMaterial color="#0ea5e9" emissive="#0369a1" emissiveIntensity={0.7} />
			</mesh>
			<mesh position={[0, 0.08, 0]}>
				<cylinderGeometry args={[0.06, 0.06, 0.32, 16]} />
				<meshStandardMaterial color="#64748b" />
			</mesh>
			<mesh position={[0, -0.09, 0]}>
				<boxGeometry args={[0.45, 0.05, 0.25]} />
				<meshStandardMaterial color="#475569" />
			</mesh>
			<mesh position={[0.55, 0.12, -0.06]}>
				<boxGeometry args={[0.28, 0.34, 0.36]} />
				<meshStandardMaterial color="#1e293b" emissive="#0f172a" emissiveIntensity={0.3} />
			</mesh>
			<Text position={[0, 0.86, 0]} fontSize={0.16} color="#f8fafc" anchorX="center" anchorY="middle">
				{pc.name}
			</Text>
			<Text position={[0, -0.28, 0]} fontSize={0.11} color="#22d3ee" anchorX="center" anchorY="middle" maxWidth={2.4}>
				{pc.mac}
			</Text>
			{showSuccess && (
				<group position={[0, 1.2, 0]}>
					<mesh>
						<planeGeometry args={[2.2, 0.38]} />
						<meshBasicMaterial color="#10b981" transparent opacity={0.88} />
					</mesh>
					<Text position={[0, 0, 0.02]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
						{'✓ Data Verified'}
					</Text>
				</group>
			)}
			{showError && (
				<group position={[0, 1.2, 0]}>
					<mesh>
						<planeGeometry args={[2.6, 0.38]} />
						<meshBasicMaterial color="#ef4444" transparent opacity={0.88} />
					</mesh>
					<Text position={[0, 0, 0.02]} fontSize={0.11} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
						{'✗ Parity Error'}
					</Text>
				</group>
			)}
		</group>
	);
}

export default function Parity2DConceptViz() {
	// ── Topology state ──
	const [setupOpen, setSetupOpen] = useState(true);
	const [pcCount, setPcCount] = useState(4);
	const [assignmentMode, setAssignmentMode] = useState('automatic');
	const [manualMacs, setManualMacs] = useState(Array.from({ length: 4 }, () => ''));
	const [pcs, setPcs] = useState([]);
	const [links, setLinks] = useState([]);
	const [setupError, setSetupError] = useState('');
	const [linkFrom, setLinkFrom] = useState('');
	const [linkTo, setLinkTo] = useState('');
	const [inputPanelVisible, setInputPanelVisible] = useState(true);
	const [receiverPanelVisible, setReceiverPanelVisible] = useState(true);
	const [transmissionPanelVisible, setTransmissionPanelVisible] = useState(true);
	const [isAnyPanelDragging, setIsAnyPanelDragging] = useState(false);
	const [transmissionComplete, setTransmissionComplete] = useState(false);
	const [transmissionHistory, setTransmissionHistory] = useState([]);
	const [pendingTxData, setPendingTxData] = useState(null);
	const [sourcePc, setSourcePc] = useState('');
	const [targetPc, setTargetPc] = useState('');
	const [txError, setTxError] = useState('');
	const [txRunId, setTxRunId] = useState(0);
	const [activeTransmission, setActiveTransmission] = useState(null);
	const [showSuccess, setShowSuccess] = useState(false);
	const [showError, setShowError] = useState(false);
	const [bitstream, setBitstream] = useState(DEFAULT_BITSTREAM);
	const [speedMultiplier, setSpeedMultiplier] = useState(0.5);

	// ── Derived ──
	const positionMap = useMemo(() => new Map(pcs.map((pc) => [pc.id, pc.position])), [pcs]);
	const toOptions = useMemo(() => pcs.filter((pc) => pc.id !== sourcePc), [pcs, sourcePc]);
	const { grid, rowParity, colParity } = useMemo(() => build2DParityGrid(bitstream), [bitstream]);

	// ── Topology handlers ──
	function preparePcConfig() {
		setSetupError('');
		if (pcCount < MIN_PCS || pcCount > MAX_PCS) {
			setSetupError(`PC count must be between ${MIN_PCS} and ${MAX_PCS}.`);
			return;
		}
		let macs = [];
		if (assignmentMode === 'manual') {
			const trimmed = manualMacs.slice(0, pcCount).map((m) => m.trim());
			if (trimmed.some((m) => !isValidMac(m))) {
				setSetupError('All manual MAC addresses must follow format XX:XX:XX:XX:XX:XX');
				return;
			}
			if (new Set(trimmed.map((m) => m.toUpperCase())).size !== trimmed.length) {
				setSetupError('Manual MAC addresses must be unique.');
				return;
			}
			macs = trimmed.map((m) => m.toUpperCase());
		} else {
			macs = uniqueMacList(pcCount);
			setManualMacs(macs);
		}
		const radius = Math.max(2.8, Math.min(4.2, pcCount * 0.65));
		const builtPcs = Array.from({ length: pcCount }, (_, i) => {
			const angle = (i / pcCount) * Math.PI * 2;
			return {
				id: `pc-${i + 1}`,
				name: `PC-${i + 1}`,
				mac: macs[i],
				position: [Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius],
			};
		});
		setPcs(builtPcs);
		setLinks([]);
		setLinkFrom(builtPcs[0]?.id ?? '');
		setLinkTo(builtPcs[1]?.id ?? '');
		setSourcePc(builtPcs[0]?.id ?? '');
		setTargetPc(builtPcs[1]?.id ?? '');
	}
	function addLink() {
		setSetupError('');
		if (!linkFrom || !linkTo) { setSetupError('Select both PCs before adding a link.'); return; }
		if (linkFrom === linkTo) { setSetupError('A PC cannot be linked to itself.'); return; }
		const key = makePairKey(linkFrom, linkTo);
		if (links.some((l) => l.key === key)) { setSetupError('Link already exists between those PCs.'); return; }
		setLinks((prev) => [...prev, { id: `link-${prev.length + 1}`, key, from: linkFrom, to: linkTo }]);
	}
	function removeLink(id) {
		setLinks((prev) => prev.filter((l) => l.id !== id));
	}
	function completeSetup() {
		if (pcs.length < MIN_PCS) { setSetupError('Prepare PCs first.'); return; }
		if (links.length === 0) { setSetupError('Add at least one link before continuing.'); return; }
		setSetupOpen(false);
	}

	// ── Transmission handlers ──
	function startTransmission() {
		setTxError('');
		if (!sourcePc || !targetPc) {
			setTxError('Select both From and To PCs.');
			return;
		}
		if (sourcePc === targetPc) {
			setTxError('From and To must be different PCs.');
			return;
		}
		const exists = links.some((l) => l.key === makePairKey(sourcePc, targetPc));
		if (!exists) {
			setTxError('No physical link between selected PCs. Add it in topology setup.');
			return;
		}
		// Build frame: grid + row/col parity
		const rows = grid.length;
		const cols = grid[0]?.length || 0;
		const frame = {
			grid: grid.map(row => [...row]),
			rowParity: [...rowParity],
			colParity: [...colParity],
			rows,
			cols,
			bitstream,
			from: sourcePc,
			to: targetPc,
			timestamp: new Date().toLocaleTimeString(),
		};
		setActiveTransmission({ ...frame, runId: txRunId + 1 });
		setTxRunId(txRunId + 1);
		setTransmissionComplete(false);
		setShowSuccess(false);
		setShowError(false);
		setPendingTxData(frame);
		setTimeout(() => {
			// Simulate transmission delay
			handleTransmissionComplete(frame);
		}, 1000 / speedMultiplier);
	}

	function handleTransmissionComplete(frame) {
		setActiveTransmission(null);
		setTransmissionComplete(true);
		// Receiver checks parity
		const { grid, rowParity, colParity, rows, cols } = frame;
		let rowError = -1, colError = -1;
		for (let r = 0; r < rows; r++) {
			const parity = grid[r].reduce((acc, b) => acc + (b === '1' ? 1 : 0), 0) % 2 === 0 ? '0' : '1';
			if (parity !== rowParity[r]) rowError = r;
		}
		for (let c = 0; c < cols; c++) {
			let ones = 0;
			for (let r = 0; r < rows; r++) if (grid[r][c] === '1') ones++;
			const parity = ones % 2 === 0 ? '0' : '1';
			if (parity !== colParity[c]) colError = c;
		}
		let verdict = '';
		if (rowError === -1 && colError === -1) {
			verdict = '✓ Data Verified (No Error Detected)';
			setShowSuccess(true);
			setShowError(false);
		} else if (rowError !== -1 && colError !== -1) {
			verdict = `✗ Error Detected at Row ${rowError + 1}, Col ${colError + 1}`;
			setShowSuccess(false);
			setShowError(true);
		} else {
			verdict = '✗ Parity Error Detected (Unclear Location)';
			setShowSuccess(false);
			setShowError(true);
		}
		setTransmissionHistory((prev) => [
			{
				...frame,
				verdict,
				rowError,
				colError,
			},
			...prev,
		]);
		setPendingTxData(null);
	}

	// ─────────────────────────────────────────────
	//  Render
	// ─────────────────────────────────────────────
	return (
		<group>
			{/* Ground grid */}
			<group position={[0, -0.7, 0]}>
				<mesh rotation={[-Math.PI / 2, 0, 0]}>
					<planeGeometry args={[15, 8]} />
					<meshStandardMaterial color="#64748b" emissive="#475569" emissiveIntensity={0.18} />
				</mesh>
			</group>

			{/* Network links */}
			{links.map((link) => {
				const start = positionMap.get(link.from);
				const end = positionMap.get(link.to);
				if (!start || !end) return null;
				return <NetworkLink key={link.id} start={start} end={end} />;
			})}

			{/* PC Nodes */}
			{pcs.map((pc) => (
				<PCNode
					key={pc.id}
					pc={pc}
					showSuccess={showSuccess && pc.id === targetPc}
					showError={showError && pc.id === targetPc}
				/>
			))}

			{/* ── HTML Panels ── */}
			<Html fullscreen style={{ pointerEvents: 'none' }}>
				<div className="w-full h-full relative">
					{isAnyPanelDragging && (
						<div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto', cursor: 'grabbing' }} />
					)}

					{/* Topology Setup Modal */}
					{setupOpen && (
						<div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
							<div className="w-[min(860px,96vw)] max-h-[90vh] overflow-auto rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-5 md:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
								<p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/85 mb-2">2D Parity Topology Setup</p>
								<h3 className="text-xl font-bold text-slate-100 mb-4">Configure PCs, MACs, and Links Before Transmission</h3>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
									{/* PC & MAC panel */}
									<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
										<p className="text-xs uppercase tracking-wider text-slate-300 mb-2">1) PC & MAC Assignment</p>
										<label htmlFor="cs-pc-count" className="block text-sm text-slate-200 mb-1">Number of PCs</label>
										<input
											id="cs-pc-count"
											type="number"
											min={MIN_PCS}
											max={MAX_PCS}
											value={pcCount}
											onChange={(e) => setPcCount(Math.max(MIN_PCS, Math.min(MAX_PCS, Number(e.target.value) || MIN_PCS)))}
											className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
										/>
										<div className="mt-3 flex flex-wrap gap-2">
											{['manual', 'automatic'].map((mode) => (
												<button
													key={mode}
													type="button"
													onClick={() => setAssignmentMode(mode)}
													className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${assignmentMode === mode ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
												>
													{mode === 'manual' ? 'Manual MAC' : 'Automatic MAC'}
												</button>
											))}
										</div>
										<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
											{Array.from({ length: pcCount }, (_, i) => (
												<div key={`cs-mac-${i}`}>
													<label className="block text-[11px] text-slate-400 mb-1">PC-{i + 1} MAC</label>
													<input
														type="text"
														value={manualMacs[i] ?? ''}
														disabled={assignmentMode !== 'manual'}
														onChange={(e) => {
															const next = [...manualMacs];
															next[i] = e.target.value;
															setManualMacs(next);
														}}
														placeholder="AA:BB:CC:DD:EE:FF"
														className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${assignmentMode === 'manual' ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-800 bg-slate-900/50 text-slate-500 cursor-not-allowed'}`}
													/>
												</div>
											))}
										</div>
										<button
											type="button"
											onClick={preparePcConfig}
											className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35"
										>
											Apply PC & MAC Setup
										</button>
									</div>
									{/* Link Builder */}
									<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
										<p className="text-xs uppercase tracking-wider text-slate-300 mb-2">2) Link Builder</p>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
											{[{ label: 'PC A', val: linkFrom, set: setLinkFrom }, { label: 'PC B', val: linkTo, set: setLinkTo }].map(({ label, val, set }, fi) => (
												<div key={`cs-lf-${fi}`}>
													<label className="block text-[11px] text-slate-400 mb-1">{label}</label>
													<select
														value={val}
														onChange={(e) => set(e.target.value)}
														className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
													>
														{pcs.map((pc) => <option key={`cs-opt-${fi}-${pc.id}`} value={pc.id}>{pc.name}</option>)}
													</select>
												</div>
											))}
										</div>
										<button
											type="button"
											onClick={addLink}
											disabled={pcs.length === 0}
											className="mt-3 w-full rounded-md bg-blue-500/25 border border-blue-300/50 px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/35 disabled:opacity-40"
										>
											Add Link
										</button>
										<div className="mt-3 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-900/70 p-2 space-y-1">
											{links.length === 0 && <p className="text-xs text-slate-500">No links added yet.</p>}
											{links.map((l) => (
												<div key={l.id} className="flex items-center justify-between rounded bg-slate-800/80 px-2 py-1">
													<p className="text-xs text-slate-200">{l.from.toUpperCase()} {'<->'} {l.to.toUpperCase()}</p>
													<button type="button" onClick={() => removeLink(l.id)} className="text-[11px] text-red-300 hover:text-red-200">remove</button>
												</div>
											))}
										</div>
										<button
											type="button"
											onClick={completeSetup}
											className="mt-3 w-full rounded-md bg-emerald-500/25 border border-emerald-300/50 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/35"
										>
											Complete Topology Setup
										</button>
									</div>
								</div>
								{setupError && (
									<p className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{setupError}</p>
								)}
							</div>
						</div>
					)}

					{/* Main Panels (after setup) */}
					{!setupOpen && (
						<>
							{/* PANEL 1: 2D Parity Input Window */}
							<DraggablePanel
								title="2D Parity Input Window"
								initialX={20}
								initialY={100}
								isVisible={inputPanelVisible}
								onToggle={() => setInputPanelVisible(!inputPanelVisible)}
								onDragChange={setIsAnyPanelDragging}
							>
								<div className="w-[min(500px,94vw)]">
									<div className="mb-3 flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => setSetupOpen(true)}
											className="px-3 py-1.5 text-xs font-semibold rounded-md border border-blue-300/50 bg-blue-500/25 text-blue-100 hover:bg-blue-500/35"
										>
											Edit Topology
										</button>
									</div>
									<div className="mb-3">
										<label className="block text-[11px] text-slate-400 mb-1">
											Transmission Speed: {speedMultiplier}x
										</label>
										<input
											type="range" min="0.2" max="2" step="0.2"
											value={speedMultiplier}
											onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
											className="w-full accent-amber-500"
										/>
										<div className="flex justify-between text-[9px] text-slate-500">
											<span>0.2x</span><span>1x</span><span>2x</span>
										</div>
									</div>
									<label htmlFor="cs-bitstream" className="block text-xs text-slate-200 mb-1 font-semibold">
										Bitstream Input (fills 4x4 grid)
									</label>
									<input
										id="cs-bitstream"
										type="text"
										value={bitstream}
										onChange={(e) => {
											const val = e.target.value.replace(/[^01]/g, '');
											setBitstream(val);
										}}
										maxLength={64}
										className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400 font-mono"
										placeholder="e.g. 1011000101110010"
									/>
									<p className="text-[10px] text-slate-500 mt-0.5">Only 0s and 1s accepted. Fills a 4x4 grid for 2D parity.</p>
													{/* From / To selects */}
													<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
														<div>
															<label className="block text-[11px] text-slate-400 mb-1">From</label>
															<select
																value={sourcePc}
																onChange={(e) => { setSourcePc(e.target.value); setTargetPc(''); }}
																className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
															>
																{pcs.map((pc) => <option key={`src-${pc.id}`} value={pc.id}>{pc.name}</option>)}
															</select>
														</div>
														<div>
															<label className="block text-[11px] text-slate-400 mb-1">To</label>
															<select
																value={targetPc}
																onChange={(e) => setTargetPc(e.target.value)}
																className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
															>
																{toOptions.map((pc) => <option key={`dst-${pc.id}`} value={pc.id}>{pc.name}</option>)}
															</select>
														</div>
													</div>
													{/* 2D Parity Grid Preview */}
													<div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
														<p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">2D Parity Grid (4x4)</p>
														<table className="border-collapse">
															<tbody>
																{grid.map((row, ri) => (
																	<tr key={`row-${ri}`}>
																		{row.map((bit, ci) => (
																			<td key={`cell-${ri}-${ci}`} className="border border-slate-700 text-center w-7 h-7 font-mono text-lg text-blue-300">{bit}</td>
																		))}
																		<td className="border border-slate-700 text-center w-7 h-7 font-mono text-lg text-orange-300">{rowParity[ri]}</td>
																	</tr>
																))}
																<tr>
																	{colParity.map((bit, ci) => (
																		<td key={`colp-${ci}`} className="border border-slate-700 text-center w-7 h-7 font-mono text-lg text-orange-300">{bit}</td>
																	))}
																	<td className="border border-slate-700 bg-slate-800" />
																</tr>
															</tbody>
														</table>
													</div>
													<button
														type="button"
														onClick={startTransmission}
														className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35"
													>
														▶ Transmit Frame
													</button>
									{txError && (
										<p className="mt-2 rounded border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">{txError}</p>
									)}
									<div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
										<p className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">How 2D Parity Works</p>
										<p className="text-xs text-slate-300 leading-relaxed">
											Sender arranges bits in a 2D grid and appends parity bits for each row and column. Receiver checks parity to detect errors. (Full logic coming soon.)
										</p>
									</div>
								</div>
							</DraggablePanel>
											{/* PANEL 2: Receiver Node */}
											<DraggablePanel
												title="Receiver Node"
												initialX={typeof window !== 'undefined' ? window.innerWidth - 520 : 800}
												initialY={typeof window !== 'undefined' ? window.innerHeight - 420 : 400}
												isVisible={receiverPanelVisible}
												onToggle={() => setReceiverPanelVisible(!receiverPanelVisible)}
												onDragChange={setIsAnyPanelDragging}
											>
												<div className="w-[min(500px,94vw)]">
													{transmissionComplete && transmissionHistory.length > 0 ? (
														<>
															<div className="rounded-md border border-slate-700 bg-slate-900/70 p-3 mb-3">
																<p className="text-[11px] text-slate-400 mb-1">Received 2D Parity Frame</p>
																<table className="border-collapse mb-2">
																	<tbody>
																		{transmissionHistory[0].grid.map((row, ri) => (
																			<tr key={`rx-row-${ri}`}>
																				{row.map((bit, ci) => (
																					<td key={`rx-cell-${ri}-${ci}`} className="border border-slate-700 text-center w-7 h-7 font-mono text-lg text-blue-300">{bit}</td>
																				))}
																				<td className="border border-slate-700 text-center w-7 h-7 font-mono text-lg text-orange-300">{transmissionHistory[0].rowParity[ri]}</td>
																			</tr>
																		))}
																		<tr>
																			{transmissionHistory[0].colParity.map((bit, ci) => (
																				<td key={`rx-colp-${ci}`} className="border border-slate-700 text-center w-7 h-7 font-mono text-lg text-orange-300">{bit}</td>
																			))}
																			<td className="border border-slate-700 bg-slate-800" />
																		</tr>
																	</tbody>
																</table>
																<div className="flex gap-3 mt-1">
																	<span className="flex items-center gap-1 text-[10px] text-blue-300">■ Data</span>
																	<span className="flex items-center gap-1 text-[10px] text-orange-300">■ Parity</span>
																</div>
															</div>
															<div className={`rounded-lg border p-3 text-center ${
																transmissionHistory[0].rowError === -1 && transmissionHistory[0].colError === -1
																	? 'border-emerald-400/50 bg-emerald-500/10'
																	: 'border-red-400/50 bg-red-500/10'
															}`}>
																<p className={`text-base font-bold ${
																	transmissionHistory[0].rowError === -1 && transmissionHistory[0].colError === -1
																		? 'text-emerald-300'
																		: 'text-red-300'
																}`}>
																	{transmissionHistory[0].verdict}
																</p>
															</div>
														</>
													) : (
														<p className="text-xs text-slate-400">Waiting for transmission. Transmit a frame to see the receiver verdict.</p>
													)}
												</div>
											</DraggablePanel>
											{/* PANEL 3: Transmission History */}
											<DraggablePanel
												title="Transmission History"
												initialX={40}
												initialY={420}
												isVisible={transmissionPanelVisible}
												onToggle={() => setTransmissionPanelVisible(!transmissionPanelVisible)}
												onDragChange={setIsAnyPanelDragging}
											>
												<div className="w-[min(500px,94vw)]">
													{transmissionHistory.length === 0 ? (
														<p className="text-xs text-slate-400">No transmissions yet.</p>
													) : (
														<ul className="space-y-2">
															{transmissionHistory.map((tx, idx) => (
																<li key={`txhist-${idx}`} className="rounded border border-slate-700 bg-slate-900/70 p-2">
																	<div className="flex items-center justify-between mb-1">
																		<span className="text-xs text-slate-300">{tx.timestamp}</span>
																		<span className="text-xs text-slate-400">From: {tx.from} → To: {tx.to}</span>
																	</div>
																	<div className="flex flex-wrap gap-2 mb-1">
																		<span className="text-xs text-blue-300">Grid: {tx.grid.flat().join('')}</span>
																		<span className="text-xs text-orange-300">Row Parity: {tx.rowParity.join('')}</span>
																		<span className="text-xs text-orange-300">Col Parity: {tx.colParity.join('')}</span>
																	</div>
																	<span className={`text-xs font-bold ${tx.rowError === -1 && tx.colError === -1 ? 'text-emerald-300' : 'text-red-300'}`}>{tx.verdict}</span>
																</li>
															))}
														</ul>
													)}
												</div>
											</DraggablePanel>
						</>
					)}
				</div>
			</Html>
		</group>
	);
}

