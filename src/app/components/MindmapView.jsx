import { useState, useEffect, useRef } from 'react';

export default function MindmapView({ data, onClose }) {
  const [parsedData, setParsedData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));
  const containerRef = useRef(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    try {
      if (typeof data === 'string') {
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        setParsedData(JSON.parse(jsonMatch ? jsonMatch[0] : data));
      } else {
        setParsedData(data);
      }
    } catch (e) { console.error(e); }
  }, [data]);

  // 선의 경로를 계산하는 로직
  const updateLines = () => {
    if (!containerRef.current || !parsedData) return;
    const newLines = [];
    const containerRect = containerRef.current.getBoundingClientRect();

    expandedNodes.forEach(parentId => {
      const parentEl = document.getElementById(`node-${parentId}`);
      if (!parentEl) return;

      const parentRect = parentEl.getBoundingClientRect();
      const parentX = parentRect.right - containerRect.left;
      const parentY = parentRect.top + parentRect.height / 2 - containerRect.top;

      parsedData.nodes.filter(n => n.parent === parentId).forEach(child => {
        const childEl = document.getElementById(`node-${child.id}`);
        if (!childEl) return;

        const childRect = childEl.getBoundingClientRect();
        const childX = childRect.left - containerRect.left;
        const childY = childRect.top + childRect.height / 2 - containerRect.top;

        // 곡선 경로 (Cubic Bezier)
        const cp1x = parentX + (childX - parentX) / 2;
        const path = `M ${parentX} ${parentY} C ${cp1x} ${parentY}, ${cp1x} ${childY}, ${childX} ${childY}`;
        newLines.push(path);
      });
    });
    setLines(newLines);
  };

  // 노드가 펼쳐지거나 창 크기가 변할 때 선 다시 그리기
  useEffect(() => {
    const timer = setTimeout(updateLines, 100); // 렌더링 대기
    window.addEventListener('resize', updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateLines);
    };
  }, [expandedNodes, parsedData]);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const buildTree = (nodes) => {
    const map = {};
    nodes.forEach(node => map[node.id] = { ...node, children: [] });
    const tree = [];
    nodes.forEach(node => {
      if (node.parent) map[node.parent]?.children.push(map[node.id]);
      else tree.push(map[node.id]);
    });
    return tree;
  };

  if (!parsedData) return null;
  const treeData = buildTree(parsedData.nodes);

  const MindmapNode = ({ node, level }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div className="flex items-center">
        <div 
          id={`node-${node.id}`}
          onClick={() => hasChildren && toggleNode(node.id)}
          className={`
            min-w-[140px] max-w-[200px] p-4 rounded-2xl border-2 transition-all text-center cursor-pointer mx-10
            ${level === 0 ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-black' : 
              level === 1 ? 'bg-blue-50 text-blue-700 border-blue-100 font-bold' : 
              'bg-emerald-50 text-emerald-700 border-emerald-100 text-xs'}
          `}
        >
          {node.text}
          {hasChildren && <span className="ml-2 opacity-30 text-[10px]">{isExpanded ? '<' : '>'}</span>}
        </div>

        {isExpanded && hasChildren && (
          <div className="flex flex-col justify-center space-y-6">
            {node.children.map(child => (
              <MindmapNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden flex flex-col h-[80vh] w-full shadow-2xl relative">
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center z-20">
        <span className="text-[10px] font-bold tracking-widest uppercase ml-2">Smooth Curve Mindmap</span>
        <button onClick={onClose} className="hover:bg-gray-800 p-1 rounded-full transition-colors mr-1">✕</button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-white p-20 flex items-center relative custom-scrollbar">
        {/* 선을 그리는 SVG 레이어 */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          {lines.map((path, i) => (
            <path key={i} d={path} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          ))}
        </svg>

        <div className="relative z-10 flex items-center">
          {treeData.map(rootNode => <MindmapNode key={rootNode.id} node={rootNode} level={0} />)}
        </div>
      </div>
    </div>
  );
}