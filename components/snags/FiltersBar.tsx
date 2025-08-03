'use client'

import { Calendar, Filter, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface FiltersBarProps {
  onSearchChange: (value: string) => void
  onStatusChange: (value: string[]) => void
  onPriorityChange: (value: string[]) => void
  onDateRangeChange: (start: Date | null, end: Date | null) => void
  onAssigneeChange: (value: string | null) => void
  onClearFilters: () => void
  teamMembers?: Array<{ id: string; firstName: string; lastName: string }>
  activeFiltersCount?: number
}

const statusOptions = [
  { value: 'OPEN', label: 'Open', color: 'bg-red-100 text-red-800' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PENDING_REVIEW', label: 'Pending Review', color: 'bg-blue-100 text-blue-800' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-green-100 text-green-800' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'bg-gray-100 text-gray-800' },
]

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

export function FiltersBar({
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onDateRangeChange,
  onAssigneeChange,
  onClearFilters,
  teamMembers = [],
  activeFiltersCount = 0,
}: FiltersBarProps) {
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onSearchChange(value)
  }

  const toggleStatus = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status]
    setSelectedStatuses(newStatuses)
    onStatusChange(newStatuses)
  }

  const togglePriority = (priority: string) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter(p => p !== priority)
      : [...selectedPriorities, priority]
    setSelectedPriorities(newPriorities)
    onPriorityChange(newPriorities)
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedStatuses([])
    setSelectedPriorities([])
    setDateRange({ start: null, end: null })
    setSelectedAssignee(null)
    onClearFilters()
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by location or description..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Status
              {selectedStatuses.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1">
                  {selectedStatuses.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filter by Status</h4>
              {statusOptions.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(option.value)}
                    onChange={() => toggleStatus(option.value)}
                    className="rounded border-gray-300"
                  />
                  <Badge variant="outline" className={cn('text-xs', option.color)}>
                    {option.label}
                  </Badge>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Priority Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Priority
              {selectedPriorities.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1">
                  {selectedPriorities.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Filter by Priority</h4>
              {priorityOptions.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedPriorities.includes(option.value)}
                    onChange={() => togglePriority(option.value)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Assignee Filter */}
        {teamMembers.length > 0 && (
          <Select
            value={selectedAssignee || undefined}
            onValueChange={value => {
              setSelectedAssignee(value)
              onAssigneeChange(value)
            }}
          >
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="All assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {teamMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
              {(dateRange.start || dateRange.end) && (
                <Badge variant="secondary" className="ml-1 px-1">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filter by Date</h4>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                    onChange={e => {
                      const newDate = e.target.value ? new Date(e.target.value) : null
                      setDateRange(prev => ({ ...prev, start: newDate }))
                      onDateRangeChange(newDate, dateRange.end)
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                    onChange={e => {
                      const newDate = e.target.value ? new Date(e.target.value) : null
                      setDateRange(prev => ({ ...prev, end: newDate }))
                      onDateRangeChange(dateRange.start, newDate)
                    }}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear all ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(selectedStatuses.length > 0 ||
        selectedPriorities.length > 0 ||
        (selectedAssignee && selectedAssignee !== 'all') ||
        dateRange.start ||
        dateRange.end) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {selectedStatuses.map(status => {
            const option = statusOptions.find(o => o.value === status)
            return option ? (
              <Badge key={status} variant="secondary" className="gap-1">
                Status: {option.label}
                <button
                  onClick={() => toggleStatus(status)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null
          })}
          {selectedPriorities.map(priority => {
            const option = priorityOptions.find(o => o.value === priority)
            return option ? (
              <Badge key={priority} variant="secondary" className="gap-1">
                Priority: {option.label}
                <button
                  onClick={() => togglePriority(priority)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null
          })}
          {selectedAssignee && selectedAssignee !== 'all' && teamMembers.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Assignee: {teamMembers.find(m => m.id === selectedAssignee)?.firstName}
              <button
                onClick={() => {
                  setSelectedAssignee(null)
                  onAssigneeChange(null)
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
