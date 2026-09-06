import React, { useMemo, useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Tree, TreeNode } from 'react-organizational-chart';
import { Search, Building2, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDirectory = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (search) {
      const timer = setTimeout(() => {
        const highlightedNode = document.querySelector('.highlighted-node');
        if (highlightedNode) {
          highlightedNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['admin', 'employees', 'directory'],
    queryFn: async () => {
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
      empMap.set(emp.id, empMap.get(emp.employeeId));
    });

    const roots = [];
    const uniqueRoots = new Set();

    employees.forEach(emp => {
      const node = empMap.get(emp.employeeId);
      if (emp.managerId && empMap.has(emp.managerId)) {
        const managerNode = empMap.get(emp.managerId);
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
      (employee.position || '').toLowerCase().includes(search.toLowerCase()) ||
      (employee.employeeId || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div 
        id={`node-${employee.id}`} 
        className={`relative mt-7 mb-3 flex flex-col items-center rounded-2xl border min-w-[210px] max-w-[250px] mx-auto pb-4 ${
          isHighlighted 
            ? 'bg-[#e8f0fe] border-[#4285F4] ring-2 ring-[#4285F4]/30 highlighted-node shadow-md' 
            : 'bg-white border-[#e0e3e7] shadow-xs'
        }`}
      >
        {/* Floating Avatar */}
        <div className="absolute -top-6 w-12 h-12 rounded-full bg-white flex items-center justify-center p-0.5 border border-[#dadce0] shadow-xs z-20">
          <div className="w-full h-full rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center font-bold text-xs overflow-hidden">
            {employee.avatar ? (
              <img src={employee.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials(employee.firstName, employee.lastName)
            )}
          </div>
        </div>

        {/* Card Content */}
        <div 
          onClick={() => navigate(`/admin/employees/${employee.id}`)}
          className="pt-7 px-3.5 w-full text-center cursor-pointer"
        >
          <div className="text-xs font-semibold text-[#1f1f1f] truncate">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-[10.5px] font-medium text-[#5f6368] truncate mt-0.5">
            {employee.position || 'Staff Member'}
          </div>
          <div className="mt-1.5 flex items-center justify-center gap-1">
            <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#444746] truncate max-w-[150px]">
              {employee.department || 'General'}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Pill Button */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="flex items-center justify-center gap-1 bg-white border border-[#dadce0] text-[10px] font-semibold text-[#5f6368] px-2.5 py-0.5 rounded-full shadow-xs cursor-pointer whitespace-nowrap"
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
    <div className="relative mt-7 mb-3 flex flex-col items-center rounded-2xl border-2 border-[#4285F4] bg-white shadow-md min-w-[210px] max-w-[250px] mx-auto pb-4 pt-7 px-4 text-center">
      {/* Floating Logo Badge */}
      <div className="absolute -top-6 w-12 h-12 rounded-full bg-white flex items-center justify-center p-0.5 border border-[#dadce0] shadow-xs z-20">
        <div className="w-full h-full rounded-full bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8]">
          <Building2 className="w-5 h-5" />
        </div>
      </div>

      <div className="text-sm font-medium tracking-tight text-[#1f1f1f] truncate w-full flex items-center justify-center gap-1 font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
        <span>Acme</span>
        <span className="italic text-[#4285F4]">HRMS</span>
      </div>
      <div className="text-[10px] font-medium text-[#5f6368] uppercase tracking-wider mt-0.5 truncate w-full">
        Root Organization
      </div>
    </div>
  );

  const doesMatchSearch = (emp, query) => {
    if (!query) return false;
    const q = query.toLowerCase();
    if ((emp.firstName + ' ' + emp.lastName).toLowerCase().includes(q)) return true;
    if ((emp.department || '').toLowerCase().includes(q)) return true;
    if ((emp.position || '').toLowerCase().includes(q)) return true;
    if ((emp.employeeId || '').toLowerCase().includes(q)) return true;
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

    return <TreeNode label={labelContent} />;
  };

  if (isLoading) return <PageLoader message="Loading Organization Directory..." />;

  return (
    <div className="space-y-4 h-[calc(100vh-6.5rem)] flex flex-col max-w-7xl mx-auto pb-4 font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Organizational Hierarchy & Tree</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight font-editorial" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>
            Organization Directory <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full align-middle ml-1.5">{employees.length} Members</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Interactive reporting tree and organizational chart.
          </p>
        </div>

        {/* Google Pill Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name, role, dept, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
          />
        </div>
      </div>

      {/* Main Scrollable Canvas */}
      <div className="flex-1 bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl overflow-auto relative shadow-xs custom-scrollbar">
        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#5f6368]">
            <User className="w-10 h-10 text-[#dadce0] mb-3" />
            <p className="text-xs font-medium text-[#1f1f1f]">No employees in the organization yet</p>
          </div>
        ) : (
          <div className="min-w-max min-h-max flex items-start justify-center pt-14 pb-32 px-16">
            <Tree
              lineWidth={'2px'}
              lineColor={'#dadce0'}
              lineBorderRadius={'10px'}
              lineHeight={'36px'}
              nodePadding={'16px'}
              label={<RootNode />}
            >
              {treeData.map(rootNode => <OrgTreeNode key={rootNode.employeeId} node={rootNode} />)}
            </Tree>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDirectory;
