package com.mediaforge.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public class TimeRangeDto {

    @NotNull(message = "start time is required")
    @DecimalMin(value = "0.0", message = "start time cannot be negative")
    private Double start;

    @NotNull(message = "end time is required")
    @DecimalMin(value = "0.0", message = "end time cannot be negative")
    private Double end;

    public TimeRangeDto() {
    }

    public TimeRangeDto(Double start, Double end) {
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
}
