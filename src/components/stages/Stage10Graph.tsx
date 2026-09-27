import React, { useState, useEffect, useRef } from 'react';
import { Share2, ZoomIn, ZoomOut, RotateCcw, Info, ArrowRight, Shield, Globe, Link2, Mail, Network, Paperclip, Hash } from 'lucide-react';
import { InvestigationState, GraphNode, GraphLink } from '../../types';

interface Stage10GraphProps {
  state: InvestigationState;
  onProceedToCampaign: () => void;
}

export const Stage10Graph: React.FC<Stage10GraphProps> = ({
  state,
  onProceedToCampaign,
}) => {
  const { nodes, links } = state.graph;
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(nodes[0] || null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Compute node positions using a deterministic radial layout centered around the email node
  const [positionedNodes, setPositionedNodes] = useState<Array<GraphNode & { x: number; y: number }>>([]);

  useEffect(() => {
    if (nodes.length === 0) return;

    const centerX = 380;
    const centerY = 240;
    const emailNode = nodes.find((n) => n.type === 'email') || nodes[0];
    const otherNodes = nodes.filter((n) => n.id !== emailNode.id);

    const radius = Math.min(220, Math.max(140, otherNodes.length * 20));
    const angleStep = (2 * Math.PI) / (otherNodes.length || 1);

    const placed = [
      { ...emailNode, x: centerX, y: centerY },
      ...otherNodes.map((node, i) => {
        const angle = i * angleStep;
        // Group slight offset
        const r = radius + (i % 2 === 0 ? 0 : 30);
        return {
          ...node,
          x: centerX + r * Math.cos(angle),
          y: centerY + r * Math.sin(angle),
        };
      }),
    ];

    setPositionedNodes(placed);
    if (!selectedNode && placed.length > 0) {
      setSelectedNode(placed[0]);
    }
  }, [nodes]);

  const getNodeColor = (type: GraphNode['type']) => {
    switch (type) {
      case 'email':
        return '#142238';
      case 'sender':
        return '#2DBDCA';
      case 'recipient':
        return '#1FA463';
      case 'domain':
        return '#0e808c';
      case 'url':
        return '#D89428';
      case 'ip':
        return '#8A4FFF';
      case 'attachment':
        return '#53657A';
      case 'hash':
        return '#D94A4A';
      default:
        return '#53657A';
    }
  };

  const getNodeIcon = (type: GraphNode['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-white" />;
      case 'domain':
        return <Globe className="w-3.5 h-3.5 text-white" />;
      case 'url':
        return <Link2 className="w-3.5 h-3.5 text-white" />;
      case 'ip':
        return <Network className="w-3.5 h-3.5 text-white" />;
      case 'attachment':
        return <Paperclip className="w-3.5 h-3.5 text-white" />;
      case 'hash':
        return <Hash className="w-3.5 h-3.5 text-white" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-white" />;
    }
  };

  // Connected links for selected node
  const connectedLinks = selectedNode
    ? links.filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
    : [];

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto p-4 sm:p-6 gap-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#2DBDCA] uppercase tracking-wider">
              Stage 10 • Entity Correlation
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142238] tracking-tight">
            Threat Graph & Evidence Network
          </h2>
          <p className="text-xs sm:text-sm text-[#53657A] mt-0.5">
            Interactive correlation graph linking senders, transit IPs, infrastructure domains, and payload hashes.
          </p>
        </div>

        <button
          type="button"
          onClick={onProceedToCampaign}
          className="px-4 py-2 rounded-lg bg-[#2DBDCA] text-[#142238] font-bold text-xs hover:bg-[#28b2be] transition-colors flex items-center gap-2 shadow-xs"
        >
          <span>Proceed to Campaign Analysis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#D9E1E6] p-12 text-center text-[#53657A]">
          <Share2 className="w-12 h-12 text-[#D9E1E6] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#142238]">No Entity Nodes Available</h3>
          <p className="text-xs max-w-sm mx-auto mt-1">
            Execute the Email Parser and IOC stages to populate the entity relationship graph.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
          {/* Left: Interactive Graph Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#D9E1E6] flex flex-col overflow-hidden relative shadow-xs min-h-[460px]">
            {/* Canvas Toolbar */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-lg border border-[#D9E1E6] shadow-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
                className="p-1 rounded text-[#53657A] hover:bg-[#F5F6F4] hover:text-[#142238] transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                className="p-1 rounded text-[#53657A] hover:bg-[#F5F6F4] hover:text-[#142238] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1 rounded text-[#53657A] hover:bg-[#F5F6F4] hover:text-[#142238] transition-colors"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas Legend */}
            <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-[#D9E1E6] text-[10px] font-medium shadow-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#142238]" /> Email
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2DBDCA]" /> Sender
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0e808c]" /> Domain
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8A4FFF]" /> IP
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D89428]" /> URL
              </span>
            </div>

            {/* SVG Graph Viewport */}
            <div
              className="flex-1 w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden bg-[#FAFBFB]"
              onMouseDown={(e) => {
                setIsDraggingCanvas(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => {
                if (isDraggingCanvas) {
                  setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }
              }}
              onMouseUp={() => setIsDraggingCanvas(false)}
              onMouseLeave={() => setIsDraggingCanvas(false)}
            >
              <svg className="w-full h-full" viewBox="0 0 760 480">
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Edges / Links */}
                  {links.map((link, idx) => {
                    const sourceNode = positionedNodes.find((n) => n.id === link.source);
                    const targetNode = positionedNodes.find((n) => n.id === link.target);
                    if (!sourceNode || !targetNode) return null;

                    const isHighlighted =
                      selectedNode && (selectedNode.id === link.source || selectedNode.id === link.target);

                    return (
                      <g key={idx}>
                        <line
                          x1={sourceNode.x}
                          y1={sourceNode.y}
                          x2={targetNode.x}
                          y2={targetNode.y}
                          stroke={isHighlighted ? '#2DBDCA' : '#D9E1E6'}
                          strokeWidth={isHighlighted ? 2.5 : 1.5}
                          strokeDasharray={link.label.includes('ROUTED') ? '4 2' : 'none'}
                        />
                        {/* Link Label */}
                        <text
                          x={(sourceNode.x + targetNode.x) / 2}
                          y={(sourceNode.y + targetNode.y) / 2 - 4}
                          fill="#8695A6"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {link.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {positionedNodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const color = getNodeColor(node.type);

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNode(node);
                        }}
                        className="cursor-pointer group"
                      >
                        {isSelected && (
                          <circle r={22} fill="none" stroke="#2DBDCA" strokeWidth={3} className="animate-pulse" />
                        )}
                        <circle
                          r={16}
                          fill={color}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          className="transition-transform group-hover:scale-110 shadow-xs"
                        />
                        <g transform="translate(-7, -7)">{getNodeIcon(node.type)}</g>
                        {/* Node Label below */}
                        <text
                          y={26}
                          fill="#142238"
                          fontSize="9"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          fontFamily="monospace"
                          textAnchor="middle"
                          className="select-none pointer-events-none"
                        >
                          {node.label.length > 20 ? `${node.label.substring(0, 17)}...` : node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="p-2.5 bg-[#F5F6F4] border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
              <span>{nodes.length} entities • {links.length} relationships</span>
              <span className="font-mono text-[#0e808c]">Dynamic Layout Engine</span>
            </div>
          </div>

          {/* Right: Entity Details Inspector Drawer (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#D9E1E6] p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-[#D9E1E6] mb-4">
                <Info className="w-4 h-4 text-[#2DBDCA]" />
                <h3 className="text-xs font-bold text-[#142238] uppercase tracking-wider">
                  Entity Details Inspector
                </h3>
              </div>

              {selectedNode ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Entity Type</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#142238] text-white">
                      {selectedNode.type}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block">Identifier / Value</span>
                    <span className="font-mono text-xs font-bold text-[#142238] break-all bg-[#F5F6F4] p-2 rounded border border-[#D9E1E6] block select-all">
                      {selectedNode.label}
                    </span>
                  </div>

                  {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                    <div>
                      <span className="text-[10px] text-[#53657A] uppercase font-semibold block mb-1">
                        Metadata Attributes
                      </span>
                      <div className="bg-[#FAFBFB] p-2.5 rounded border border-[#D9E1E6] font-mono text-[10px] space-y-1 text-[#142238]">
                        {Object.entries(selectedNode.metadata).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-[#53657A]">{k}:</span>
                            <span className="truncate max-w-[160px]" title={String(v)}>
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-[#53657A] uppercase font-semibold block mb-1">
                      Direct Relationships ({connectedLinks.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {connectedLinks.map((link, idx) => (
                        <div
                          key={idx}
                          className="bg-[#F5F6F4] p-2 rounded border border-[#D9E1E6] text-[10px] font-mono flex items-center justify-between"
                        >
                          <span className="text-[#0e808c] font-bold">{link.label}</span>
                          <span className="text-[#53657A] truncate max-w-[130px]">
                            {link.source === selectedNode.id ? link.target.split(':')[1] : link.source.split(':')[1]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-[#53657A]">
                  <p className="text-xs">Click any node on the graph to inspect entity attributes and direct links.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#D9E1E6] text-[11px] text-[#53657A] flex items-center justify-between">
              <span>All nodes derived from actual evidence state</span>
              <span className="font-mono text-[#0e808c]">Zero Synthetic Nodes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
