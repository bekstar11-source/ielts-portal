import React from 'react';

// Specialized components
import { MapLabeling } from './types/MapLabeling';
import { Matching } from './types/Matching';
import { SelectionBox } from './types/SelectionBox';
import { TableCompletion, NoteCompletion } from './types/Completion';
import { FlowChart } from './types/FlowChart';
import { MultipleChoice } from './types/MultipleChoice';

/**
 * Main Question Renderer for Listening Test.
 * Dispatches to specialized components based on group.type or structure.
 */
export const ListeningQuestionRenderer = ({ group, userAnswers, onAnswerChange, isReviewMode, handleLocationClick, onSeekTo, activePart }) => {
    const type = (group.type || "").toLowerCase();

    const commonProps = {
        group,
        userAnswers,
        onAnswerChange,
        isReviewMode,
        handleLocationClick,
        onSeekTo,
        activePart
    };

    switch (type) {
        case 'map':
        case 'map-labeling':
        case 'map_labeling':
            return <MapLabeling {...commonProps} />;

        case 'matching':
            return <Matching {...commonProps} />;

        case 'selection':
        case 'selection-box':
        case 'multiple-selection':
            return <SelectionBox {...commonProps} />;

        case 'table':
        case 'table-completion':
            return <TableCompletion {...commonProps} />;

        case 'note':
        case 'note-completion':
        case 'form-completion':
        case 'summary-completion':
            return <NoteCompletion {...commonProps} />;

        case 'flowchart':
        case 'flow-chart':
        case 'flowchart-completion':
            return <FlowChart {...commonProps} />;

        case 'multiple-choice':
        case 'mcq':
        case 'standard-mcq':
            return <MultipleChoice {...commonProps} />;

        default:
            // Fallback detection logic
            if (group.image) return <MapLabeling {...commonProps} />;
            if (group.headers || group.rows) return <TableCompletion {...commonProps} />;
            if (group.groups) return <NoteCompletion {...commonProps} />;
            if (group.options) return <MultipleChoice {...commonProps} />;
            
            return (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center opacity-50">
                    Noma'lum savol turi: {type || 'aniqlanmadi'}
                </div>
            );
    }
};

// Also export individual types for direct usage if needed
export { MapLabeling, Matching, SelectionBox, TableCompletion, NoteCompletion, FlowChart, MultipleChoice };