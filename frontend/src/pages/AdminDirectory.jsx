import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Loader2, Search, Building2, User, ZoomIn, ZoomOut, Maximize, ChevronDown, ChevronUp } from 'lucide-react';

const AdminDirectory = () => {
  const [search, setSearch] = useState('');
  const transformRef = useRef(null);

  useEffect(() => {
    if (search && transformRef.current) {
      // Delay to allow React to expand the branches before panning
      const timer = setTimeout(() => {
        const highlightedNode = document.querySelector('.highlighted-node');
        if (highlightedNode) {
          transformRef.current.zoomToElement(highlightedNode, 1, 600, 'easeOut');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['admin', 'employees', 'directory'],
    queryFn: async () => {
      // Fetch all employees without pagination limits for the tree
      const res = await api.get('/admin/employees?limit=1000');
      return res.data.employees || [];
    },
  });

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  };

  const treeData = useMemo(() => {
    if (!employees.length) return [];

    const empMap = new Map();
    employees.forEach(emp => {
      empMap.set(emp.employeeId, { ...emp, children: [] });
      // Also map by UUID in case managerId is stored as UUID
      empMap.set(emp.id, empMap.get(emp.employeeId)); 
    });

    const roots = [];
    const uniqueRoots = new Set();

    employees.forEach(emp => {
      const node = empMap.get(emp.employeeId);
      if (emp.managerId && empMap.has(emp.managerId)) {
        const managerNode = empMap.get(emp.managerId);
        // Prevent infinite loops if manager references self
        if (managerNode.employeeId !== node.employeeId) {
          managerNode.children.push(node);
        } else {
           if (!uniqueRoots.has(node.employeeId)) {
             uniqueRoots.add(node.employeeId);
             roots.push(node);
           }
        }
      } else {
        if (!uniqueRoots.has(node.employeeId)) {
          uniqueRoots.add(node.employeeId);
          roots.push(node);
        }
      }
    });

    return roots;
  }, [employees]);

  const EmployeeNode = ({ employee, isExpanded, toggleExpand, hasChildren }) => {
    const isHighlighted = search && (
      (employee.firstName + ' ' + employee.lastName).toLowerCase().includes(search.toLowerCase()) ||
      (employee.department || '').toLowerCase().includes(search.toLowerCase()) ||
      (employee.position || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div id={`node-${employee.id}`} className={`relative mt-6 mb-2 flex flex-col items-center rounded-xl border border-slate-200 ${isHighlighted ? 'bg-blue-50 ring-2 ring-blue-300 scale-105 highlighted-node' : 'bg-white'} shadow-sm min-w-[200px] max-w-[240px] transition-all duration-300 hover:shadow-md hover:-translate-y-1 z-10 mx-auto group pb-4`}>
        
        {/* Floating Avatar */}
        <div className="absolute -top-6 w-12 h-12 rounded-full bg-white flex items-center justify-center p-0.5 border border-slate-200 shadow-sm z-20 transition-transform group-hover:scale-110">
          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm overflow-hidden">
            {employee.avatar ? (
              <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(employee.firstName, employee.lastName)
            )}
          </div>
        </div>
        
        {/* Card Content */}
        <div className="pt-8 px-4 w-full text-center">
          <div className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
            {employee.position || 'Employee'}
          </div>
        </div>

        {/* Expand/Collapse Pill */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
            <button 
              onClick={toggleExpand}
              className="flex items-center justify-center gap-1 bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 px-3 py-1 rounded-full shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer w-max"
            >
              {isExpanded ? (
                <>Collapse <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>{employee.children.length} Reports <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const RootNode = () => (
    <div className="relative mt-6 mb-2 flex flex-col items-center rounded-xl border border-slate-200 bg-white shadow-xl min-w-[200px] max-w-[240px] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 z-10 mx-auto group pb-5 pt-8 px-4 text-center">
      {/* Floating Icon */}
      <div className="absolute -top-6 w-12 h-12 rounded-full bg-white flex items-center justify-center p-0.5 border border-slate-200 shadow-sm z-20 transition-transform group-hover:scale-110">
        <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center shadow-inner">
          <Building2 className="w-5 h-5 text-blue-600 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
      
      <div className="font-bold text-sm tracking-widest text-slate-800 group-hover:text-blue-700 transition-colors truncate w-full">ACME CORP</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 truncate w-full">Root Organization</div>
    </div>
  );

  const doesMatchSearch = (emp, query) => {
    if (!query) return false;
    const q = query.toLowerCase();
    if ((emp.firstName + ' ' + emp.lastName).toLowerCase().includes(q)) return true;
    if ((emp.department || '').toLowerCase().includes(q)) return true;
    if ((emp.position || '').toLowerCase().includes(q)) return true;
    return false;
  };

  const hasMatchingDescendant = (emp, query) => {
    if (!query) return false;
    if (!emp.children || emp.children.length === 0) return false;
    return emp.children.some(child => doesMatchSearch(child, query) || hasMatchingDescendant(child, query));
  };

  const OrgTreeNode = ({ node }) => {
    const isHighlighted = doesMatchSearch(node, search);
    const hasMatchInSubtree = hasMatchingDescendant(node, search);
    
    const [isExpanded, setIsExpanded] = useState(isHighlighted || false);
    const hasChildren = node.children && node.children.length > 0;

    useEffect(() => {
      if (search && hasMatchInSubtree) {
        setIsExpanded(true);
      }
    }, [search, hasMatchInSubtree]);

    const labelContent = (
      <EmployeeNode 
        employee={node} 
        isExpanded={isExpanded} 
        toggleExpand={() => setIsExpanded(!isExpanded)} 
        hasChildren={hasChildren}
      />
    );

    if (isExpanded && hasChildren) {
      return (
        <TreeNode label={labelContent}>
          {node.children.map(child => (
            <OrgTreeNode key={child.employeeId} node={child} />
          ))}
        </TreeNode>
      );
    }

    // Completely omit children block to prevent dangling lines
    return <TreeNode label={labelContent} />;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organization Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Interactive company hierarchy</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="search" 
            placeholder="Search by name, role, or dept..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm pl-9 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p>Loading organization structure...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <User className="w-12 h-12 text-slate-300 mb-4" />
            <p>No employees found.</p>
          </div>
        ) : (
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={1}
            maxScale={1}
            centerOnInit={true}
            limitToBounds={false}
            wheel={{ disabled: true }}
            pinch={{ disabled: true }}
            doubleClick={{ disabled: true }}
            panOnScroll={true}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <div className="relative w-full h-full">
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="min-w-max min-h-max flex items-start justify-center pt-16 pb-32 px-16">
                  <Tree
                    lineWidth={'2px'}
                    lineColor={'#cbd5e1'}
                    lineBorderRadius={'8px'}
                    lineHeight={'40px'}
                    nodePadding={'20px'}
                    label={<RootNode />}
                  >
                    {treeData.map(rootNode => <OrgTreeNode key={rootNode.employeeId} node={rootNode} />)}
                  </Tree>
                </TransformComponent>
              </div>
            )}
          </TransformWrapper>
        )}
      </div>
    </div>
  );
};

export default AdminDirectory;
