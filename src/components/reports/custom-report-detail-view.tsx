"use client";

import { useState } from "react";
import { getDefaultDateRange } from "@/lib/reports/types";
import type { ReportFilters } from "@/lib/reports/types";
import { CUSTOM_REPORT_META } from "@/lib/reports/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { OwnerMultiSelect } from "@/components/reports/owner-multi-select";
import { CustomReportBuilder } from "@/components/reports/custom-report-builder";
import type { RecipientOption } from "@/components/reports/recipient-email-multi-select";
import { ReportDetailHeader } from "@/components/reports/report-detail-header";

function buildFilters(
  contactName: string,
  contactEmail: string,
  ownerIds: string[],
  categoryId: string,
  departmentId: string
): ReportFilters | undefined {
  const filters: ReportFilters = {};
  if (contactName.trim()) filters.contact_name = contactName.trim();
  if (contactEmail.trim()) filters.contact_email = contactEmail.trim();
  if (ownerIds.length > 0) filters.owner_ids = ownerIds;
  if (categoryId) filters.category_id = categoryId;
  if (departmentId) filters.department_id = departmentId;
  return Object.keys(filters).length > 0 ? filters : undefined;
}

interface CustomReportDetailViewProps {
  agents: { id: string; full_name: string }[];
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  canSchedule?: boolean;
  recipientOptions?: RecipientOption[];
}

export function CustomReportDetailView({
  agents,
  categories,
  departments,
  canSchedule = false,
  recipientOptions = [],
}: CustomReportDetailViewProps) {
  const today = new Date().toISOString().split("T")[0];
  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultRange.dateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(defaultRange.dateTo);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters | undefined>();

  function handleSearch() {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedFilters(buildFilters(contactName, contactEmail, ownerIds, categoryId, departmentId));
  }

  return (
    <div className="space-y-6">
      <ReportDetailHeader
        title={CUSTOM_REPORT_META.label}
        description={CUSTOM_REPORT_META.description}
      />

      <div className="rounded-lg border bg-white p-4 sm:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="report-date-from">From</Label>
            <Input
              id="report-date-from"
              type="date"
              value={dateFrom}
              max={today}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-date-to">To</Label>
            <Input
              id="report-date-to"
              type="date"
              value={dateTo}
              max={today}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="report-contact-name">Contact Name</Label>
            <Input
              id="report-contact-name"
              placeholder="Search by name..."
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-contact-email">Contact Email</Label>
            <Input
              id="report-contact-email"
              type="email"
              placeholder="Search by email..."
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <OwnerMultiSelect
              id="report-owner"
              agents={agents}
              value={ownerIds}
              onChange={setOwnerIds}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId || "all"}
              onValueChange={(value) => setCategoryId(value === "all" ? "" : value)}
            >
              <SelectTrigger id="report-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={departmentId || "all"}
              onValueChange={(value) => setDepartmentId(value === "all" ? "" : value)}
            >
              <SelectTrigger id="report-department">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        <CustomReportBuilder
          dateFrom={appliedDateFrom}
          dateTo={appliedDateTo}
          filters={appliedFilters}
          canSchedule={canSchedule}
          recipientOptions={recipientOptions}
        />
      </div>
    </div>
  );
}
