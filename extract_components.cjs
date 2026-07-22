const fs = require('fs');

const lines = fs.readFileSync('src/pages/teacher/TeacherTests.jsx', 'utf8').split('\n');

// The line numbers we discovered:
// Assign block: 619 to 1228
// Monitor block: 1230 to 1777

const assignJsx = lines.slice(619, 1227).join('\n'); // omit the outer `if` wrapper
const monitorJsx = lines.slice(1231, 1776).join('\n'); // omit outer `if`

const assignComponent = `import React, { useState, useRef } from 'react';
import { ArrowLeft, CheckCircle, X } from '@phosphor-icons/react';
// Note: You will need to add the other Phosphor icons and Firebase imports later

export default function AssignTestForm({ 
    isDark, toast, showToast,
    groups, availableTests,
    selectedGroupIds, setSelectedGroupIds,
    searchTestQuery, setSearchTestQuery,
    testTypeFilter, setTestTypeFilter,
    selectedTests, setSelectedTests,
    deadline, setDeadline,
    maxAttempts, setMaxAttempts,
    teacherNote, setTeacherNote,
    priority, setPriority,
    assigning, selectedPartsMap, setSelectedPartsMap,
    onBack, onAssign
}) {
    const filteredAvailableTests = availableTests.filter(t => {
        const matchesQuery = t?.title?.toLowerCase().includes(searchTestQuery.toLowerCase());
        const tLow = (t?.type || '').toLowerCase();
        let matchesType = testTypeFilter === 'all';
        if (!matchesType) {
            if (testTypeFilter === 'mock_full') {
                matchesType = tLow.includes('mock') || tLow.includes('full');
            } else {
                matchesType = tLow === testTypeFilter;
            }
        }
        return matchesQuery && matchesType;
    });

    const isTestPrevAssignedInAny = (testId) =>
        groups.some(g => selectedGroupIds.has(g.id) && (g.assignedTests || []).some(a => a.id === testId));
    
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const groupDropdownRef = useRef(null);
    const selectedGroupNames = groups.filter(g => selectedGroupIds.has(g.id)).map(g => g.name);
    
    const toggleGroupId = (gid) => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev);
            if (next.has(gid)) next.delete(gid); else next.add(gid);
            return next;
        });
    };

    // We replace the handleAssignTest call with onAssign
    const handleAssignSubmit = (e) => {
        e.preventDefault();
        onAssign(e);
    };

    // Now the JSX
    return (
        <div className={\`space-y-6 animate-fade-in-up text-left \${isDark ? 'text-white' : 'text-slate-800'}\`}>
${assignJsx.replace(/setShowAssignPage\(false\)/g, 'onBack()').replace(/onSubmit={handleAssignTest}/g, 'onSubmit={handleAssignSubmit}')}
        </div>
    );
}
`;

fs.writeFileSync('src/components/teacher/tests/AssignTestForm.jsx', assignComponent);

console.log("Extracted AssignTestForm.jsx");
