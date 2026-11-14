package com.mediaforge.backend.converter.model;

import java.util.Objects;

/**
 * Represents a continuous time segment (in seconds) for media editing operations (trim, cut).
 */
public class TimeRange {

    private Double start;
    private Double end;

    public TimeRange() {
    }

    public TimeRange(Double start, Double end) {
        this.start = start;
        this.end = end;
    }

    public Double getStart() {
        return start;
    }

    public void setStart(Double start) {
        this.start = start;
    }

    public Double getEnd() {
        return end;
    }

    public void setEnd(Double end) {
        this.end = end;
    }

    public double getDuration() {
        if (start == null || end == null) return 0.0;
        return Math.max(0.0, end - start);
    }

    public boolean isValid() {
        return start != null && end != null && start >= 0.0 && end > start;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimeRange timeRange = (TimeRange) o;
        return Objects.equals(start, timeRange.start) && Objects.equals(end, timeRange.end);
    }

    @Override
    public int hashCode() {
        return Objects.hash(start, end);
    }

    @Override
    public String toString() {
        return "TimeRange{" + "start=" + start + ", end=" + end + '}';
    }
}
