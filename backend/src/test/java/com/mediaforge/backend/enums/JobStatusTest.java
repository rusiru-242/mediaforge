package com.mediaforge.backend.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JobStatusTest {

    @Test
    @DisplayName("Should validate correct job status transitions")
    void testValidTransitions() {
        assertTrue(JobStatus.PENDING.canTransitionTo(JobStatus.QUEUED));
        assertTrue(JobStatus.PENDING.canTransitionTo(JobStatus.CANCELLED));
        assertTrue(JobStatus.PENDING.canTransitionTo(JobStatus.FAILED));

        assertTrue(JobStatus.QUEUED.canTransitionTo(JobStatus.PROCESSING));
        assertTrue(JobStatus.QUEUED.canTransitionTo(JobStatus.CANCELLED));

        assertTrue(JobStatus.PROCESSING.canTransitionTo(JobStatus.COMPLETED));
        assertTrue(JobStatus.PROCESSING.canTransitionTo(JobStatus.FAILED));
        assertTrue(JobStatus.PROCESSING.canTransitionTo(JobStatus.CANCELLED));

        assertTrue(JobStatus.PENDING.canTransitionTo(JobStatus.PENDING));
    }

    @Test
    @DisplayName("Should prevent transitions out of terminal states")
    void testTerminalStatesCannotTransition() {
        assertTrue(JobStatus.COMPLETED.isTerminal());
        assertTrue(JobStatus.FAILED.isTerminal());
        assertTrue(JobStatus.CANCELLED.isTerminal());

        assertFalse(JobStatus.COMPLETED.canTransitionTo(JobStatus.PROCESSING));
        assertFalse(JobStatus.FAILED.canTransitionTo(JobStatus.QUEUED));
        assertFalse(JobStatus.CANCELLED.canTransitionTo(JobStatus.PROCESSING));
    }

    @Test
    @DisplayName("Should enforce cancellation eligibility rules")
    void testCancellationRules() {
        assertTrue(JobStatus.PENDING.canBeCancelled());
        assertTrue(JobStatus.QUEUED.canBeCancelled());
        assertTrue(JobStatus.PROCESSING.canBeCancelled());

        assertFalse(JobStatus.COMPLETED.canBeCancelled());
        assertFalse(JobStatus.FAILED.canBeCancelled());
        assertFalse(JobStatus.CANCELLED.canBeCancelled());
    }
}
