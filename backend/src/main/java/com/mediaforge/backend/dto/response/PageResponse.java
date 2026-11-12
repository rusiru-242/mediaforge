package com.mediaforge.backend.dto.response;

import java.util.Collections;
import java.util.List;

public class PageResponse<T> {

    private List<T> content;
    private long totalElements;
    private int totalPages;
    private int size;
    private int number;
    private boolean first;
    private boolean last;
    private boolean empty;

    public PageResponse() {
        this.content = Collections.emptyList();
    }

    public PageResponse(List<T> content, int number, int size, long totalElements) {
        this.content = content != null ? content : Collections.emptyList();
        this.number = number;
        this.size = size > 0 ? size : 20;
        this.totalElements = totalElements;
        this.totalPages = this.size > 0 ? (int) Math.ceil((double) totalElements / this.size) : 0;
        this.first = number == 0;
        this.last = totalPages == 0 || number >= totalPages - 1;
        this.empty = this.content.isEmpty();
    }

    public List<T> getContent() {
        return content;
    }

    public void setContent(List<T> content) {
        this.content = content;
        this.empty = content == null || content.isEmpty();
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public int getNumber() {
        return number;
    }

    public void setNumber(int number) {
        this.number = number;
    }

    public boolean isFirst() {
        return first;
    }

    public void setFirst(boolean first) {
        this.first = first;
    }

    public boolean isLast() {
        return last;
    }

    public void setLast(boolean last) {
        this.last = last;
    }

    public boolean isEmpty() {
        return empty;
    }

    public void setEmpty(boolean empty) {
        this.empty = empty;
    }
}
