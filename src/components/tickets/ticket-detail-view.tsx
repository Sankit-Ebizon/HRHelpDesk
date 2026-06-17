"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addComment, updateTicket, addTimeLog, updateTimeLog, deleteTimeLog, uploadAttachment } from "@/lib/actions/tickets";
import { runWithLoading } from "@/lib/loading-store";
import { formatDate, formatDateTime, formatRelative, minutesToHHMM, sanitizeRichTextHtml, stripHtmlTags } from "@/lib/utils";
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from "@/types";
import type { Ticket, TicketComment, TicketAttachment, TimeLog, TicketHistory, Profile } from "@/types";
import { MessageSquare, FileText, Clock, History, Paperclip, Send, Lock, Download, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketDetailViewProps {
  ticket: Ticket;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  timeLogs: TimeLog[];
  history: TicketHistory[];
  departments: { id: string; name: string }[];
  categories: { id: string; name: string; subcategories?: { id: string; name: string }[] }[];
  agents: { id: string; full_name: string }[];
  currentUser: Profile;
}

export function TicketDetailView({
  ticket,
  comments,
  attachments,
  timeLogs,
  history,
  departments,
  categories,
  agents,
  currentUser,
}: TicketDetailViewProps) {
  const [replyContent, setReplyContent] = useState("");
  const [internalContent, setInternalContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [categoryId, setCategoryId] = useState(ticket.category_id || "");
  const [editingTimeLogId, setEditingTimeLogId] = useState<string | null>(null);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const agentsById = new Map(agents.map((agent) => [agent.id, agent.full_name]));
  const categoriesById = new Map(categories.map((category) => [category.id, category.name]));

  const totalMinutes = timeLogs.reduce((sum, log) => sum + log.time_spent_minutes, 0);
  const canEditAllTimeLogs = ["administrator", "hr_manager"].includes(currentUser.role);

  async function handleReply(type: "reply" | "internal") {
    const content = type === "reply" ? replyContent : internalContent;
    if (!stripHtmlTags(content).trim()) return;
    setLoading(true);
    await runWithLoading(() => addComment(ticket.id, content, type));
    if (type === "reply") setReplyContent("");
    else setInternalContent("");
    setLoading(false);
  }

  async function handleUpdateTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await runWithLoading(() => updateTicket(ticket.id, formData));
    setEditMode(false);
    setLoading(false);
  }

  async function handleAddTimeLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await runWithLoading(() => addTimeLog(ticket.id, formData));
    (e.target as HTMLFormElement).reset();
    setLoading(false);
  }

  async function handleUpdateTimeLog(e: React.FormEvent<HTMLFormElement>, logId: string) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await runWithLoading(() => updateTimeLog(logId, formData));
    setEditingTimeLogId(null);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    await runWithLoading(() => uploadAttachment(ticket.id, formData));
    setLoading(false);
  }

  return (
    <Tabs defaultValue="conversation" className="space-y-4">
      <TabsList>
        <TabsTrigger value="conversation" className="gap-2">
          <MessageSquare className="h-4 w-4" /> Conversation
        </TabsTrigger>
        <TabsTrigger value="details" className="gap-2">
          <FileText className="h-4 w-4" /> Details
        </TabsTrigger>
        <TabsTrigger value="attachments" className="gap-2">
          <Paperclip className="h-4 w-4" /> Attachments ({attachments.length})
        </TabsTrigger>
        <TabsTrigger value="time-logs" className="gap-2">
          <Clock className="h-4 w-4" /> Time Logs ({timeLogs.length})
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-2">
          <History className="h-4 w-4" /> History
        </TabsTrigger>
      </TabsList>

      {/* Conversation Tab */}
      <TabsContent value="conversation" className="space-y-4">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                  {ticket.contact_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ticket.contact_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(ticket.created_at)}</span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {comments.map((comment) => (
            <Card key={comment.id} className={comment.comment_type === "internal" ? "border-amber-200 bg-amber-50/50" : ""}>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    comment.comment_type === "internal" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  )}>
                    {comment.author_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      {comment.comment_type === "internal" && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                          <Lock className="h-3 w-3" /> Internal
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
                    </div>
                    <div
                      className="text-sm mt-1 prose prose-sm max-w-none whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(comment.content) }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Reply to Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RichTextEditor
                placeholder="Type your reply..."
                value={replyContent}
                onChange={setReplyContent}
              />
              <Button size="sm" onClick={() => handleReply("reply")} disabled={loading || !stripHtmlTags(replyContent).trim()}>
                <Send className="h-4 w-4 mr-1" /> Send Reply
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4" /> Internal Comment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Add internal note (not visible to contact)..."
                value={internalContent}
                onChange={(e) => setInternalContent(e.target.value)}
                rows={4}
              />
              <Button size="sm" variant="secondary" onClick={() => handleReply("internal")} disabled={loading || !stripHtmlTags(internalContent).trim()}>
                Add Internal Note
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Details Tab */}
      <TabsContent value="details">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ticket Details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? "Cancel" : "Edit"}
            </Button>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <form onSubmit={handleUpdateTicket} className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input name="subject" defaultValue={ticket.subject} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea name="description" defaultValue={ticket.description} rows={4} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input name="contact_name" defaultValue={ticket.contact_name} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input name="contact_email" type="email" defaultValue={ticket.contact_email} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Details</Label>
                  <Input name="contact_details" defaultValue={ticket.contact_details || ""} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={ticket.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select name="priority" defaultValue={ticket.priority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select name="owner_id" defaultValue={ticket.owner_id || ""}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input name="due_date" type="date" defaultValue={ticket.due_date?.split("T")[0] || ""} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select name="department_id" defaultValue={ticket.department_id || ""}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="category_id" value={categoryId} />
                  </div>
                </div>
                {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Sub-category</Label>
                    <Select name="subcategory_id" defaultValue={ticket.subcategory_id || ""}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {selectedCategory.subcategories.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" disabled={loading}>Save Changes</Button>
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-muted-foreground">Ticket ID</dt><dd className="font-mono font-medium">{ticket.ticket_number}</dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd>{TICKET_STATUS_LABELS[ticket.status]}</dd></div>
                <div><dt className="text-muted-foreground">Priority</dt><dd>{TICKET_PRIORITY_LABELS[ticket.priority]}</dd></div>
                <div><dt className="text-muted-foreground">Owner</dt><dd>{ticket.owner?.full_name || "Unassigned"}</dd></div>
                <div><dt className="text-muted-foreground">Department</dt><dd>{ticket.department?.name || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Category</dt><dd>{ticket.category?.name || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Due Date</dt><dd>{ticket.due_date ? formatDate(ticket.due_date) : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Created</dt><dd>{formatDateTime(ticket.created_at)}</dd></div>
                <div><dt className="text-muted-foreground">Modified</dt><dd>{formatDateTime(ticket.updated_at)}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Description</dt><dd className="mt-1 whitespace-pre-wrap">{ticket.description}</dd></div>
              </dl>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Attachments Tab */}
      <TabsContent value="attachments">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attachments</CardTitle>
            <div>
              <input type="file" id="file-upload" className="hidden" onChange={handleUpload} />
              <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                Upload File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments yet.</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ""} · {formatRelative(att.created_at)}
                        </p>
                      </div>
                    </div>
                    <a href={`/api/attachments/${att.id}/download`} download>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" /> Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Time Logs Tab */}
      <TabsContent value="time-logs" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Time Logs</span>
              <span className="text-sm font-normal text-muted-foreground">
                Total: <strong className="text-foreground">{minutesToHHMM(totalMinutes)}</strong>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No time entries yet.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {timeLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3">
                    {editingTimeLogId === log.id ? (
                      <form onSubmit={(e) => handleUpdateTimeLog(e, log.id)} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Log Date</Label>
                            <Input name="log_date" type="date" defaultValue={log.log_date} required max={new Date().toISOString().split("T")[0]} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Time (HH:MM)</Label>
                            <Input name="time_spent" defaultValue={minutesToHHMM(log.time_spent_minutes)} required pattern="\d{1,2}:\d{2}" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Textarea name="description" defaultValue={log.description} required rows={2} />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={loading}>Save</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingTimeLogId(null)}>Cancel</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-medium">{log.user?.full_name}</span>
                            <span className="text-muted-foreground">|</span>
                            <span>{formatDate(log.log_date)}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="font-mono font-medium">{minutesToHHMM(log.time_spent_minutes)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                        </div>
                        {(log.user_id === currentUser.id || canEditAllTimeLogs) && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingTimeLogId(log.id)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive text-xs"
                              onClick={() => runWithLoading(() => deleteTimeLog(log.id))}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Add Time Entry</h4>
              <form onSubmit={handleAddTimeLog} className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Log Date *</Label>
                  <Input name="log_date" type="date" required max={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-2">
                  <Label>Time Spent (HH:MM) *</Label>
                  <Input name="time_spent" placeholder="00:30" required pattern="\d{1,2}:\d{2}" />
                </div>
                <div className="space-y-2 col-span-3">
                  <Label>Description *</Label>
                  <Textarea name="description" placeholder="What did you work on?" required rows={2} />
                </div>
                <Button type="submit" size="sm" disabled={loading}>Add Time Entry</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="text-xs text-muted-foreground w-36 shrink-0">{formatDateTime(h.created_at)}</div>
                    <div>
                      {(() => {
                        const fieldName = h.field_name === "owner_id"
                          ? "owner"
                          : h.field_name === "category_id"
                            ? "category"
                            : h.field_name;
                        const oldValue = h.field_name === "owner_id"
                          ? (h.old_value ? agentsById.get(h.old_value) || "Unassigned" : "Unassigned")
                          : h.field_name === "category_id"
                            ? (h.old_value ? categoriesById.get(h.old_value) || "—" : "—")
                            : h.old_value;
                        const newValue = h.field_name === "owner_id"
                          ? (h.new_value ? agentsById.get(h.new_value) || "Unassigned" : "Unassigned")
                          : h.field_name === "category_id"
                            ? (h.new_value ? categoriesById.get(h.new_value) || "—" : "—")
                            : h.new_value;
                        return (
                          <>
                      <span className="font-medium">{h.user_name}</span>
                      {" changed "}
                      <span className="font-medium">{fieldName}</span>
                      {oldValue && <> from <span className="text-muted-foreground">{oldValue}</span></>}
                      {" to "}
                      <span className="font-medium">{newValue}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
