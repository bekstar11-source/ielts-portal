const fs = require('fs');

const file = 'src/pages/teacher/TeacherTests.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const assignProps = `        return (
            <AssignTestForm
                isDark={isDark} toast={toast} showToast={showToast}
                groups={groups} availableTests={availableTests}
                selectedGroupIds={selectedGroupIds} setSelectedGroupIds={setSelectedGroupIds}
                searchTestQuery={searchTestQuery} setSearchTestQuery={setSearchTestQuery}
                testTypeFilter={testTypeFilter} setTestTypeFilter={setTestTypeFilter}
                selectedTests={selectedTests} setSelectedTests={setSelectedTests}
                deadline={deadline} setDeadline={setDeadline}
                maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
                teacherNote={teacherNote} setTeacherNote={setTeacherNote}
                priority={priority} setPriority={setPriority}
                assigning={assigning} selectedPartsMap={selectedPartsMap} setSelectedPartsMap={setSelectedPartsMap}
                onBack={() => {
                    setSelectedTests([]);
                    setSelectedGroupIds(new Set());
                    setSelectedPartsMap({});
                    setDeadline("");
                    setMaxAttempts("1");
                    setTeacherNote("");
                    setPriority("medium");
                    setShowAssignPage(false);
                }}
                onAssign={handleAssignTest}
            />
        );`;

const monitorProps = `        return (
            <MonitorTestPage
                isDark={isDark} toast={toast} showToast={showToast}
                monitoringTest={monitoringTest} results={results} 
                podcastAttempts={podcastAttempts} students={students} groups={groups}
                fetchData={fetchData}
                onBack={() => { setShowMonitorPage(false); setMonitoringTest(null); }}
            />
        );`;

// Find assign start
let assignStart = -1, assignEnd = -1, monitorStart = -1, monitorEnd = -1;

for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('if (showAssignPage) {') && assignStart === -1) assignStart = i;
    if (lines[i].includes('if (showMonitorPage && monitoringTest) {') && monitorStart === -1) monitorStart = i;
}

// Find assign end
let count = 0;
for(let i=assignStart; i<lines.length; i++) {
    count += (lines[i].match(/{/g) || []).length;
    count -= (lines[i].match(/}/g) || []).length;
    if (count === 0) { assignEnd = i; break; }
}

// Find monitor end
count = 0;
for(let i=monitorStart; i<lines.length; i++) {
    count += (lines[i].match(/{/g) || []).length;
    count -= (lines[i].match(/}/g) || []).length;
    if (count === 0) { monitorEnd = i; break; }
}

const newLines = [];
for(let i=0; i<lines.length; i++) {
    if (i === assignStart + 1) {
        newLines.push(assignProps);
        i = assignEnd - 1; // skip to end of assign block
        continue;
    }
    if (i === monitorStart + 1) {
        newLines.push(monitorProps);
        i = monitorEnd - 1; // skip to end of monitor block
        continue;
    }
    newLines.push(lines[i]);
}

fs.writeFileSync(file, newLines.join('\n'));
console.log("Successfully updated TeacherTests.jsx with extracted components!");
