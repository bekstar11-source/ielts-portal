// Simulate the isMultiSelect logic from QuestionGroup.jsx
const checkIsMultiSelect = (type) => {
    const isMultiSelect = type.includes('pick_two') || type.includes('pick_three') || type.includes('multi');
    return isMultiSelect;
};

const typesToTest = [
    'multiple_choice',
    'multiple choice',
    'mcq',
    'pick_two',
    'pick_three',
    'multi_selection',
    'multi_choice'
];

typesToTest.forEach(type => {
    console.log(`Type: "${type}" -> isMultiSelect: ${checkIsMultiSelect(type)}`);
});
