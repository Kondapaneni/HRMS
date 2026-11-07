import { useMemo, useState, useEffect } from 'react';
import PageLoader from '../components/PageLoader';
import { useQuery } from '@tanstack/react-query';
import { Tree, TreeNode } from 'react-organizational-chart';
import { Building2, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import SearchBar from '../components/ui/SearchBar';
import { fetchAllAdminEmployees } from '../utils/fetchAllAdminEmployees';

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
      return fetchAllAdminEmployees();
    },
  });

  const treeData = useMemo(() => {
    if (!employees.length) return [];

    const empMap = new Map();
    employees.forEach((emp) => {
      empMap.set(emp.employeeId, { ...emp, children: [] });
      empMap.set(emp.id, empMap.get(emp.employeeId));
    });

    const roots = [];
    const uniqueRoots = new Set();

    employees.forEach((emp) => {
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
    const isHighlighted =
      search &&
      ((employee.firstName + ' ' + employee.lastName).toLowerCase().includes(search.toLowerCase()) ||
        (employee.department || '').toLowerCase().includes(search.toLowerCase()) ||
        (employee.position || '').toLowerCase().includes(search.toLowerCase()) ||
        (employee.employeeId || '').toLowerCase().includes(search.toLowerCase()));

    return (
      <div
        id={`node-${employee.id}`}
        className={`relative mt-8 mb-3 flex flex-col items-center rounded-[20px] border min-w-[210px] max-w-[250px] mx-auto pb-4 transition-all ${
          isHighlighted
            ? 'bg-[var(--brand-tint)] border-[var(--brand)] ring-2 ring-[var(--brand)]/30 highlighted-node shadow-md'
            : 'bg-[var(--surface)] border-[var(--line)]'
        }`}
      >
        {/* Floating Avatar (14px rounded square) */}
        <div className="absolute -top-6 w-12 h-12 rounded-[14px] bg-[var(--surface)] flex items-center justify-center p-0.5 border border-[var(--line)] shadow-xs z-20">
          <Avatar
            name={`${employee.firstName || ''} ${employee.lastName || ''}`}
            src={employee.avatar}
            size={42}
            shape="square"
            radius={12}
          />
        </div>

        {/* Card Content */}
        <div
          onClick={() => navigate(`/admin/employees/${employee.id}`)}
          className="pt-8 px-3.5 w-full text-center cursor-pointer"
        >
          <div className="text-xs font-medium text-[var(--text)] truncate">
            {employee.firstName} {employee.lastName}
          </div>
          <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
            {employee.position || 'Staff member'}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-alt)] text-[var(--text-2)] truncate max-w-[150px]">
              {employee.department || 'General'}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Pill Button */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="flex items-center justify-center gap-1 bg-[var(--surface)] border border-[var(--line)] text-[10px] font-medium text-[var(--muted)] hover:text-[var(--text)] px-2.5 py-0.5 rounded-full shadow-xs cursor-pointer whitespace-nowrap transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Collapse</span> <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>{employee.children.length} reports</span> <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  const RootNode = () => (
    <div className="relative mt-8 mb-3 flex flex-col items-center rounded-[20px] border border-[var(--brand)] bg-[var(--surface)] min-w-[210px] max-w-[250px] mx-auto pb-4 pt-8 px-4 text-center">
      {/* Floating Logo Badge */}
      <div className="absolute -top-6 w-12 h-12 rounded-[14px] bg-[var(--ink)] text-white flex items-center justify-center border border-[var(--line)] shadow-xs z-20">
        <Building2 className="w-5 h-5 text-[var(--brand)]" />
      </div>

      <div className="text-sm font-medium tracking-tight text-[var(--text)] truncate w-full flex items-center justify-center gap-1">
        <span>Acme</span>
        <span className="text-[var(--brand-deep)]">HRMS</span>
      </div>
      <div className="text-[10px] text-[var(--muted)] mt-0.5 truncate w-full">
        Root organization
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
    return emp.children.some(
      (child) => doesMatchSearch(child, query) || hasMatchingDescendant(child, query)
    );
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
    }, [hasMatchInSubtree]);

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
          {node.children.map((child) => (
            <OrgTreeNode key={child.employeeId} node={child} />
          ))}
        </TreeNode>
      );
    }

    return <TreeNode label={labelContent} />;
  };

  if (isLoading) return <PageLoader message="Loading organization directory..." />;

  return (
    <div className="space-y-4 h-[calc(100vh-6.5rem)] flex flex-col max-w-7xl mx-auto pb-4 antialiased">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
              Organization directory
            </h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              {employees.length} members
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Interactive organizational reporting tree and hierarchy
          </p>
        </div>

        {/* Search Pill */}
        <SearchBar
          placeholder="Search by name, role, dept, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          wrapperClassName="w-full sm:w-80"
        />
      </div>

      {/* Main Canvas */}
      <div className="flex-1 bg-[var(--surface)] rounded-[24px] overflow-auto relative custom-scrollbar">
        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--muted)]">
            <User className="w-10 h-10 opacity-30 mb-3" />
            <p className="text-xs font-medium text-[var(--text)]">No employees in the organization yet</p>
          </div>
        ) : (
          <div className="min-w-max min-h-max flex items-start justify-center pt-14 pb-32 px-16">
            <Tree
              lineWidth="2px"
              lineColor="var(--line, #EFEFF1)"
              lineBorderRadius="12px"
              lineHeight="36px"
              nodePadding="16px"
              label={<RootNode />}
            >
              {treeData.map((rootNode) => (
                <OrgTreeNode key={rootNode.employeeId} node={rootNode} />
              ))}
            </Tree>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDirectory;
