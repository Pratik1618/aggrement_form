import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, FileText, Pencil, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "../hooks/useRedux";
import { useDispatch } from "react-redux";
import { setShowAddendumForm, setEditingAddendum, setActiveTab } from "../slice/uiSlice";
import { statusBadgeClass } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRANCH_OPTIONS = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
];

const Required = () => <span className="text-destructive">*</span>;

const AddendumForm = () => {
  const dispatch = useDispatch();
  const { addendums, ui } = useAppState();
  const { actions: addendumsActions } = addendums;
  const { editingAddendum, actions: uiActions } = ui;

  const [form, setForm] = useState({
    title: "",
    description: "",
    effectiveDate: new Date(),
    reason: "",
    impact: "",
    additionalDocuments: [],
    branches: [],
  });

  const [errors, setErrors] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clauseModifications, setClauseModifications] = useState([]);
  const [showClauseModificationForm, setShowClauseModificationForm] = useState(false);
  const [clauseForm, setClauseForm] = useState({ clause: "", action: "modified", description: "" });

  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchDescription, setNewBranchDescription] = useState("");

  useEffect(() => {
    setForm({
      title: "",
      description: "",
      effectiveDate: new Date(),
      reason: "",
      impact: "",
      additionalDocuments: [],
      branches: [],
    });
    setUploadedFiles({});
    setClauseModifications([]);
    setErrors({});

    if (editingAddendum && editingAddendum.id) {
      setIsEditMode(true);
      setForm({
        title: editingAddendum.title || "",
        description: editingAddendum.description || "",
        effectiveDate: editingAddendum.effectiveDate ? new Date(editingAddendum.effectiveDate) : new Date(),
        reason: editingAddendum.reason || "",
        impact: editingAddendum.impact || "",
        additionalDocuments: editingAddendum.additionalDocuments || [],
        branches: editingAddendum.branches || [],
      });
      setUploadedFiles(editingAddendum.uploadedFiles || {});
      setClauseModifications(editingAddendum.clauseModifications || []);
    } else {
      setIsEditMode(false);
      setClauseModifications([]);

      if (editingAddendum && editingAddendum.parentAgreementId) {
        setForm({
          title: editingAddendum.title || "",
          description: editingAddendum.description || "",
          effectiveDate: editingAddendum.effectiveDate ? new Date(editingAddendum.effectiveDate) : new Date(),
          reason: editingAddendum.reason || "",
          impact: editingAddendum.impact || "",
          additionalDocuments: editingAddendum.additionalDocuments || [],
          branches: editingAddendum.branches || [],
        });
        setUploadedFiles(editingAddendum.uploadedFiles || {});
      }
    }
  }, [editingAddendum]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.description.trim()) newErrors.description = "Description is required";
    if (!form.reason.trim()) newErrors.reason = "Reason is required";
    if (!form.impact.trim()) newErrors.impact = "Impact is required";
    return newErrors;
  };

  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;

    const newBranch = {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      description: newBranchDescription,
      createdAt: new Date().toLocaleDateString(),
      status: "Active",
    };

    setForm(prev => ({ ...prev, branches: [...prev.branches, newBranch] }));
    setNewBranchName("");
    setNewBranchDescription("");
  };

  const handleRemoveBranch = (id) => {
    setForm(prev => ({ ...prev, branches: prev.branches.filter(b => b.id !== id) }));
  };

  const handleAddClauseModification = () => {
    if (clauseForm.clause.trim() && clauseForm.description.trim()) {
      setClauseModifications(prev => [...prev, { ...clauseForm }]);
      setClauseForm({ clause: "", action: "modified", description: "" });
      setShowClauseModificationForm(false);
    }
  };

  const handleRemoveClauseModification = (index) => {
    setClauseModifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelClauseModification = () => {
    setClauseForm({ clause: "", action: "modified", description: "" });
    setShowClauseModificationForm(false);
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        toast.error("Please fill in all required fields.");
        return;
      }

      const serializedUploadedFiles = {};
      Object.keys(uploadedFiles).forEach(key => {
        const fileData = uploadedFiles[key];
        if (fileData && fileData.file instanceof File) {
          serializedUploadedFiles[key] = {
            name: fileData.file.name,
            size: fileData.file.size,
            type: fileData.file.type,
            lastModified: fileData.file.lastModified,
            uploaded: fileData.uploaded || false,
          };
        } else {
          serializedUploadedFiles[key] = fileData;
        }
      });

      const serializedClauseModifications = clauseModifications.map(mod => ({
        clause: mod.clause || "",
        action: mod.action || "modified",
        description: mod.description || "",
      }));

      const serializedBranches = (form.branches || []).map(branch => ({
        id: branch.id || "",
        name: branch.name || "",
        description: branch.description || "",
        createdAt: branch.createdAt || "",
        status: branch.status || "Active",
      }));

      const addendumData = {
        id: editingAddendum?.id || `ADD${Date.now()}`,
        title: form.title,
        description: form.description,
        effectiveDate: form.effectiveDate.toISOString().split("Z")[0],
        reason: form.reason,
        impact: form.impact,
        uploadedFiles: serializedUploadedFiles,
        clauseModifications: serializedClauseModifications,
        parentAgreementId: editingAddendum?.parentAgreementId,
        parentAgreementTitle: editingAddendum?.parentAgreementTitle,
        submittedDate: new Date().toISOString().split("T")[0],
        submittedBy: "checker",
        status: "Pending Review",
        branches: serializedBranches,
      };

      if (!addendumData.parentAgreementId) {
        toast.error("Parent agreement ID is missing. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (!addendumData.parentAgreementTitle) {
        addendumData.parentAgreementTitle = `Agreement ${addendumData.parentAgreementId}`;
      }

      if (isEditMode && editingAddendum) {
        addendumData.originalSubmittedDate = editingAddendum.submittedDate;
        addendumData.originalSubmittedBy = editingAddendum.submittedBy;
      }

      if (isEditMode) {
        addendumsActions.update({ id: editingAddendum.id, updates: addendumData });
      } else {
        try {
          addendumsActions.add(addendumData);
        } catch (error) {
          toast.error("Error adding addendum: " + error.message);
          setIsSubmitting(false);
          return;
        }
      }

      uiActions.setShowAddendumForm(false);
      uiActions.setEditingAddendum(null);

      setForm({
        title: "", description: "", effectiveDate: new Date(), reason: "", impact: "",
        additionalDocuments: [], branches: [],
      });
      setUploadedFiles({});
      setClauseModifications([]);
      setErrors({});
      setIsSubmitting(false);
      setIsEditMode(false);

      toast.success(isEditMode ? "Addendum updated." : "Addendum submitted.");
    } catch (error) {
      toast.error("Error: " + error.message);
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (type, file) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only PDF, DOCX, JPG, JPEG, PNG allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [type]: { file, uploaded: true, name: file.name },
    }));
  };

  const handleRemoveFile = (type) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[type];
      return newFiles;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    dispatch(setShowAddendumForm(false));
    dispatch(setEditingAddendum(null));
    dispatch(setActiveTab("agreements"));
  };

  return (
    <>
    <Dialog open onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{isEditMode ? "Edit Addendum" : "Create Addendum"}</DialogTitle>
          {editingAddendum && (
            <DialogDescription>
              Parent Agreement: {editingAddendum.parentAgreementTitle} (ID: {editingAddendum.parentAgreementId})
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {editingAddendum && (
            <div className="mb-6 rounded-lg border bg-muted/40 p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <FileText className="size-4" /> Parent Agreement
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Client:</span> {editingAddendum.parentAgreementTitle}</div>
                <div><span className="font-medium">Branches:</span> {editingAddendum.parentAgreementBranches}</div>
                <div><span className="font-medium">Agreement ID:</span> {editingAddendum.parentAgreementId}</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge className={statusBadgeClass("Pending Review")}>Pending Review</Badge>
                </div>
              </div>
            </div>
          )}

          <section className="mb-8">
            <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-foreground">Addendum Details</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="addendum-title" className="mb-2">Title <Required /></Label>
                <Input
                  id="addendum-title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Enter addendum title"
                  aria-invalid={!!errors.title}
                />
                {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title}</p>}
              </div>

              <div>
                <Label className="mb-2">Effective Date <Required /></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="size-4" />
                      {form.effectiveDate ? format(form.effectiveDate, "yyyy-MM-dd") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.effectiveDate}
                      onSelect={(date) => date && setForm(prev => ({ ...prev, effectiveDate: date }))}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-6">
              <Label htmlFor="addendum-description" className="mb-2">Description <Required /></Label>
              <Textarea
                id="addendum-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe the addendum purpose and scope"
                aria-invalid={!!errors.description}
              />
              {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="addendum-reason" className="mb-2">Reason for Addendum <Required /></Label>
                <Textarea
                  id="addendum-reason"
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Explain why this addendum is needed"
                  aria-invalid={!!errors.reason}
                />
                {errors.reason && <p className="mt-1 text-sm text-destructive">{errors.reason}</p>}
              </div>

              <div>
                <Label htmlFor="addendum-impact" className="mb-2">Business Impact <Required /></Label>
                <Textarea
                  id="addendum-impact"
                  name="impact"
                  value={form.impact}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the business impact of this addendum"
                  aria-invalid={!!errors.impact}
                />
                {errors.impact && <p className="mt-1 text-sm text-destructive">{errors.impact}</p>}
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Branches</h3>

            <div className="mb-6">
              <Label className="mb-2">Select Branches <Required /></Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-1 text-muted-foreground">Branch Name</Label>
                  <Select value={newBranchName} onValueChange={setNewBranchName}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCH_OPTIONS.map(branch => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 text-muted-foreground">Description</Label>
                  <Textarea
                    value={newBranchDescription}
                    onChange={(e) => setNewBranchDescription(e.target.value)}
                    rows={1}
                    placeholder="Enter branch description (optional)"
                  />
                </div>
              </div>
              <Button
                type="button"
                className="mt-3"
                onClick={handleAddBranch}
                disabled={!newBranchName.trim()}
              >
                Add Branch
              </Button>
            </div>

            {form.branches.length > 0 ? (
              <div className="space-y-3">
                {form.branches.map((branch) => (
                  <div key={branch.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{branch.name}</div>
                      {branch.description && (
                        <div className="mt-1 text-sm text-muted-foreground">{branch.description}</div>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        Added: {branch.createdAt} &bull; Status: {branch.status}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveBranch(branch.id)}
                      aria-label="Remove branch"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/40 p-4 text-center text-sm italic text-muted-foreground">
                No branches selected yet. Use the dropdown above to add branches.
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold text-foreground">Clause Modifications</h2>
              <Button type="button" size="sm" onClick={() => setShowClauseModificationForm(true)}>
                + Add Clause Change
              </Button>
            </div>
            <p className="mb-4 text-muted-foreground">
              Track which clauses are being modified, added, or removed by this addendum
            </p>

            {clauseModifications.length > 0 && (
              <div className="space-y-3">
                {clauseModifications.map((mod, index) => (
                  <div key={index} className="rounded-lg border bg-muted/40 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            mod.action === "added" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" :
                            mod.action === "removed" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                          }
                        >
                          {mod.action}
                        </Badge>
                        <span className="font-medium text-foreground">{mod.clause}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveClauseModification(index)}
                        aria-label="Remove clause modification"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{mod.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-foreground">Additional Documents</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { key: "supporting", label: "Supporting Documents", hint: "Click to upload supporting documents" },
                { key: "amendment", label: "Amendment Documents", hint: "Click to upload amendment documents" },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <Label className="mb-2">{label}</Label>
                  <div className="rounded-lg border-2 border-dashed p-6 text-center">
                    <input
                      type="file"
                      onChange={(e) => e.target.files[0] && handleFileUpload(key, e.target.files[0])}
                      className="hidden"
                      id={`${key}-upload`}
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                    />
                    <label htmlFor={`${key}-upload`} className="cursor-pointer">
                      <Upload className="mx-auto mb-2 size-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{hint}</p>
                      <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, JPG, PNG up to 10MB</p>
                    </label>
                  </div>
                  {uploadedFiles[key] && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {uploadedFiles[key].name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveFile(key)}
                        aria-label={`Remove ${label}`}
                      >
                        <X className="size-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : isEditMode ? "Update Addendum" : "Submit Addendum"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog open={showClauseModificationForm} onOpenChange={setShowClauseModificationForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4 text-primary" /> Add New Clause Modification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1">Clause Title <Required /></Label>
              <Input
                value={clauseForm.clause}
                onChange={(e) => setClauseForm(prev => ({ ...prev, clause: e.target.value }))}
                placeholder="e.g., Payment Terms, SLA, Insurance"
              />
            </div>
            <div>
              <Label className="mb-1">Action <Required /></Label>
              <Select
                value={clauseForm.action}
                onValueChange={(value) => setClauseForm(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="added">Added</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1">Details <Required /></Label>
              <Textarea
                value={clauseForm.description}
                onChange={(e) => setClauseForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Describe the specific changes or new clause details..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelClauseModification}>Cancel</Button>
            <Button onClick={handleAddClauseModification}>Add Modification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddendumForm;
