import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  X,
  Plus,
  Trash2,
  Eye,
  CalendarIcon,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { setEditingAgreement, setActiveTab, setFormDirty } from '../slice/uiSlice';
import { createAgreement, updateAgreement } from '../slice/agreementsSlice';
import { useAppState } from '../hooks/useRedux';
import { toDate } from '../lib/dates';
import { deleteDraft, isDraftId, listDrafts, saveDraft } from '../lib/draftStore';
import { openStoredFile } from '../lib/files';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';
import { Button, buttonVariants } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { ScrollArea } from '../components/ui/scroll-area';
import { cn } from '../lib/utils';

const DEFAULT_CLAUSES = [
  { title: 'Term and termination (Duration)', content: '', file: null },
  { title: 'Payment Terms', content: '', file: null },
  { title: 'Penalty', content: '', file: null },
  { title: 'Minimum Wages', content: '', file: null },
  { title: 'Costing - Salary Breakup', content: '', file: null },
  { title: 'SLA', content: '', file: null },
  { title: 'Indemnity', content: '', file: null },
  { title: 'Insurance', content: '', file: null },
];

const DEFAULT_CONTACT_INFO = {
  name: '',
  email: '',
  phone: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  ismartName: '',
  ismartEmail: '',
  ismartPhone: '',
};

const DEFAULT_UPLOAD_STATUSES = {
  LOI: { uploaded: false, file: null },
  WO: { uploaded: false, file: null },
  PO: { uploaded: false, file: null },
  EmailApproval: { uploaded: false, file: null },
};

const UPLOAD_LABELS = {
  LOI: 'LOI (Letter of Intent)',
  WO: 'WO (Work Order)',
  PO: 'PO (Purchase Order)',
  EmailApproval: 'Email Approval',
};

const BRANCH_LABELS = {
  Mumbai: 'Mumbai Branch (MUM)',
  Delhi: 'Delhi Branch (DEL)',
  Bangalore: 'Bangalore Branch (BLR)',
  Pune: 'Pune Branch (PUN)',
  Chennai: 'Chennai Branch (CHE)',
  Hyderabad: 'Hyderabad Branch (HYD)',
  Kolkata: 'Kolkata Branch (KOL)',
};

const buildDefaultFormData = () => ({
  selectedClient: '',
  selectedDepartment: '',
  selectedBranches: [],
  agreementType: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  openAgreement: false,
  remarks: '',
  entityType: 'single',
  groupCompanies: [''],
  isRenewal: false,
  originalAgreementId: '',
  importantClauses: DEFAULT_CLAUSES,
  contactInfo: { ...DEFAULT_CONTACT_INFO },
  uploadStatuses: DEFAULT_UPLOAD_STATUSES,
  clientDraftFile: { uploaded: false, file: null },
});

const normalizeAgreement = (agreement) => ({
  ...agreement,
  contactInfo: agreement.contactInfo || { ...DEFAULT_CONTACT_INFO },
  importantClauses: agreement.importantClauses || DEFAULT_CLAUSES,
  selectedBranches: (agreement.selectedBranches || []).map((branch) =>
    typeof branch === 'string' ? branch : branch.name
  ),
  groupCompanies: agreement.groupCompanies || [''],
  uploadStatuses: { ...DEFAULT_UPLOAD_STATUSES, ...agreement.uploadStatuses },
  clientDraftFile: agreement.clientDraftFile || { uploaded: false, file: null },
});

// File objects stringify to {} and data URLs are huge, so reduce both to a comparable identity.
const serializeForm = (data) =>
  JSON.stringify(data, (key, value) => {
    if (value instanceof File) return `${value.name}:${value.size}:${value.lastModified}`;
    if (key === 'dataUrl') return value?.length;
    return value;
  });

// Compact styled trigger shared by the date pickers below.
function DateField({ label, required, value, onChange, disabled, minDate }) {
  const date = value ? parseISO(value) : undefined;
  const earliest = minDate ? parseISO(minDate) : undefined;
  return (
    <div>
      <Label className="mb-2">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {date ? format(date, 'dd MMM yyyy') : 'Pick a date'}
            <CalendarIcon className="size-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date || earliest}
            disabled={earliest ? { before: earliest } : undefined}
            onSelect={(d) => d && onChange(format(d, 'yyyy-MM-dd'))}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const AgreementForm = () => {
  const dispatch = useDispatch();
  const { user } = useAppState();

  const editingAgreement = useSelector(state => {
    try {
      return state?.ui?.editingAgreement || null;
    } catch (error) {
      console.error("Error accessing Redux state:", error);
      return null;
    }
  });

  const isEditing = !!editingAgreement;

  const safeGet = (obj, path, defaultValue = '') => {
    const result = path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
    return typeof result === 'string' ? result : String(result || defaultValue);
  };

  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [isFormReady, setIsFormReady] = useState(false);
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeForm(formData));
  const [drafts, setDrafts] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);

  const isDirty = serializeForm(formData) !== savedSnapshot;

  const loadIntoForm = (data) => {
    setFormData(data);
    setSavedSnapshot(serializeForm(data));
  };

  // Functions passed to useState are treated as updaters, hence the wrapper.
  const runGuarded = (action) => {
    if (isDirty) {
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const clientOptions = [
    'Tech Solutions',
    'ABC Corp',
    'XYZ Ltd',
    'Global Industries',
    'Innovation Labs',
  ];

  const branchOptions = [
    'Pan India',
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Pune',
    'Chennai',
    'Hyderabad',
    'Kolkata',
  ];

  const agreementTypeOptions = ['Client Draft', 'iSmart Draft'];

  // Load editing data
  useEffect(() => {
    if (isEditing && editingAgreement) {
      try {
        if (typeof editingAgreement !== 'object' || editingAgreement === null) {
          console.error("Invalid editingAgreement:", editingAgreement);
          return;
        }

        if (formData.selectedClient === editingAgreement.selectedClient &&
            formData.agreementType === editingAgreement.agreementType) {
          return;
        }

        loadIntoForm(normalizeAgreement(editingAgreement));
        setIsFormReady(true);
      } catch (error) {
        console.error("Error in AgreementForm useEffect:", error);
        loadIntoForm(buildDefaultFormData());
        setIsFormReady(true);
      }
    } else if (!isEditing) {
      setIsFormReady(true);
    }
  }, [isEditing, editingAgreement?.id]);

  useEffect(() => {
    listDrafts().then(setDrafts).catch((error) => {
      console.error('Error loading drafts:', error);
      toast.error('Saved drafts could not be loaded.');
    });
  }, []);

  useEffect(() => {
    dispatch(setFormDirty(isDirty));
    if (!isDirty) return undefined;

    const warnBeforeUnload = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty, dispatch]);

  useEffect(() => () => {
    dispatch(setFormDirty(false));
  }, [dispatch]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleBranch = (branch) => {
    setFormData(prev => {
      const currentBranches = prev.selectedBranches;
      const isCurrentlySelected = currentBranches.includes(branch);

      if (branch === 'Pan India') {
        return {
          ...prev,
          selectedBranches: isCurrentlySelected ? [] : [...branchOptions],
        };
      }

      let newBranches;
      if (isCurrentlySelected) {
        newBranches = currentBranches.filter(b => b !== branch && b !== 'Pan India');
      } else {
        newBranches = [...currentBranches.filter(b => b !== 'Pan India'), branch];
        const individualBranches = branchOptions.filter(b => b !== 'Pan India');
        if (individualBranches.every(b => newBranches.includes(b))) {
          newBranches = [...branchOptions];
        }
      }

      return { ...prev, selectedBranches: newBranches };
    });
  };

  const addGroupCompany = () => {
    setFormData(prev => ({ ...prev, groupCompanies: [...prev.groupCompanies, ''] }));
  };

  const removeGroupCompany = (index) => {
    setFormData(prev => ({
      ...prev,
      groupCompanies: prev.groupCompanies.filter((_, i) => i !== index),
    }));
  };

  const updateGroupCompany = (index, value) => {
    setFormData(prev => ({
      ...prev,
      groupCompanies: prev.groupCompanies.map((company, i) => (i === index ? value : company)),
    }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone);
  };

  const validateContactInfo = () => {
    const errors = {};

    const email = safeGet(formData, 'contactInfo.email');
    if (!email || email.trim() === '') {
      errors.email = 'I Smart email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address (e.g., user@example.com)';
    }

    const phone = safeGet(formData, 'contactInfo.phone');
    if (!phone || phone.trim() === '') {
      errors.phone = 'I Smart phone number is required';
    } else if (!validatePhone(phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number starting with 6-9';
    }

    const clientEmail = safeGet(formData, 'contactInfo.clientEmail');
    if (!clientEmail || clientEmail.trim() === '') {
      errors.clientEmail = 'Client email is required';
    } else if (!validateEmail(clientEmail)) {
      errors.clientEmail = 'Please enter a valid email address (e.g., user@example.com)';
    }

    const clientPhone = safeGet(formData, 'contactInfo.clientPhone');
    if (!clientPhone || clientPhone.trim() === '') {
      errors.clientPhone = 'Client phone number is required';
    } else if (!validatePhone(clientPhone)) {
      errors.clientPhone = 'Please enter a valid 10-digit phone number starting with 6-9';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateClause = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      importantClauses: prev.importantClauses.map((clause, i) =>
        i === index ? { ...clause, [field]: value } : clause
      ),
    }));
  };

  const addClause = () => {
    setFormData(prev => ({
      ...prev,
      importantClauses: [...prev.importantClauses, { title: '', content: '', file: null }],
    }));
  };

  const removeClause = (index) => {
    setFormData(prev => ({
      ...prev,
      importantClauses: prev.importantClauses.filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = (type, file) => {
    if (file) {
      setFormData(prev => ({
        ...prev,
        uploadStatuses: {
          ...prev.uploadStatuses,
          [type]: { uploaded: true, file },
        },
      }));
    }
  };

  const handleClauseFileUpload = (clauseIndex, file) => {
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      dataUrl: null,
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      updateClause(clauseIndex, 'file', { ...fileData, dataUrl: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleClientDraftUpload = (file) => {
    if (file) {
      setFormData(prev => ({ ...prev, clientDraftFile: { uploaded: true, file } }));
    }
  };

  const handleSaveDraft = async () => {
    const draft = {
      ...formData,
      id: isDraftId(formData.id) ? formData.id : `draft_${Date.now()}`,
      status: 'Draft',
      submittedBy: user?.role || 'checker',
      draftName: `${formData?.selectedClient || 'Untitled'} - ${new Date().toLocaleDateString()}`,
      savedAt: new Date().toISOString(),
    };

    try {
      await saveDraft(draft);
      loadIntoForm(draft);
      setFormErrors([]);
      setDrafts(await listDrafts());
      toast.success('Draft saved.');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('The draft could not be saved. Your changes are still on this page.');
    }
  };

  const handleDeleteDraft = async (draft) => {
    try {
      await deleteDraft(draft.id);
      setDrafts(prev => prev.filter(item => item.id !== draft.id));
      if (formData.id === draft.id) {
        loadIntoForm(buildDefaultFormData());
      }
      toast.success('Draft deleted.');
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('The draft could not be deleted.');
    }
  };

  const handleSubmit = async () => {
    if (!validateContactInfo()) {
      toast.error('Please fix the contact information errors before submitting.');
      return;
    }

    const errors = [];

    if (!formData?.selectedClient) {
      errors.push('Client selection is required');
    }
    if (!formData?.selectedBranches || formData.selectedBranches.length === 0) {
      errors.push('At least one branch must be selected');
    }
    if (formData?.agreementType === 'Client Draft' && !formData?.clientDraftFile?.uploaded) {
      errors.push('Client draft file is required for Client Draft agreements');
    }
    if (!formData?.startDate) {
      errors.push('Start date is required');
    }
    if (!formData?.openAgreement && !formData?.endDate) {
      errors.push('End date is required for closed agreements');
    }
    if (!formData?.openAgreement && formData?.startDate && formData?.endDate &&
        toDate(formData.endDate) < toDate(formData.startDate)) {
      errors.push('End date cannot be before the start date');
    }

    const hasAnyDocument = formData.uploadStatuses?.WO?.uploaded ||
                          formData.uploadStatuses?.PO?.uploaded ||
                          formData.uploadStatuses?.LOI?.uploaded ||
                          formData.uploadStatuses?.EmailApproval?.uploaded;

    if (!hasAnyDocument) {
      errors.push('At least one document (WO, PO, LOI, or Email) must be uploaded');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the errors listed at the top of the form.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormErrors([]);

    const agreementData = {
      ...formData,
      status: 'Under Review',
      submittedDate: new Date().toISOString().split('T')[0],
      submittedBy: user?.role || 'checker',
    };

    if (isEditing) {
      dispatch(updateAgreement({ id: editingAgreement.id, updates: agreementData }));
    } else {
      dispatch(createAgreement(agreementData));
    }

    if (isDraftId(formData.id)) {
      try {
        await deleteDraft(formData.id);
      } catch (error) {
        console.error('Error removing submitted draft:', error);
        toast.warning('The agreement was submitted, but its draft could not be removed.');
      }
    }

    toast.success(isEditing ? 'Agreement updated.' : 'Agreement submitted for review.');

    loadIntoForm(buildDefaultFormData());
    dispatch(setEditingAgreement(null));
    dispatch(setActiveTab('agreements'));
  };

  if (!isFormReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  // Expiry alert: fires whenever an end date is set on a non-open agreement.
  const expiryAlert = (() => {
    if (!formData.endDate || formData.openAgreement) return null;

    const today = new Date();
    const toDate = new Date(formData.endDate + 'T00:00:00');
    const daysUntilExpiry = Math.ceil((toDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      return {
        tone: 'destructive',
        message: `This agreement has expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago. Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for renewal/escalation.`,
      };
    }
    if (daysUntilExpiry <= 30) {
      return {
        tone: 'warning',
        message: `This agreement is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for renewal/escalation.`,
      };
    }
    return {
      tone: 'warning',
      message: 'Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for this agreement.',
    };
  })();

  const branchLabel = formData.selectedBranches.length === 0
    ? 'Select client branches...'
    : formData.selectedBranches.length === branchOptions.length
    ? 'Pan India (All Branches)'
    : `${formData.selectedBranches.length} branch${formData.selectedBranches.length === 1 ? '' : 'es'} selected`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isDraftId(formData?.id) ? 'Draft Agreement' : isEditing && formData?.isRenewal ? 'Editing Agreement' : (isEditing ? 'Edit Agreement' : 'New Agreement')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isDraftId(formData?.id)
            ? 'Continue this draft and submit it when it is ready'
            : isEditing && formData?.isRenewal
            ? `Agreement ID: ${formData?.originalAgreementId || 'N/A'} • Client: ${formData?.selectedClient}`
            : (isEditing ? 'Update agreement details' : 'Create a new agreement')}
        </p>

        {isEditing && formData?.isRenewal && (
          <Card className="mt-4 border-primary/30 bg-primary/5">
            <CardContent className="flex gap-3 pt-4">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="text-sm text-foreground">
                <p className="font-medium">Renewing Agreement</p>
                <p className="mt-1 text-muted-foreground">Agreement ID: {formData?.originalAgreementId || 'N/A'}</p>
                <p className="text-muted-foreground">Client: {formData?.selectedClient}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {formErrors.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex gap-3 pt-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Please fix the following before submitting:</p>
              <ul className="mt-1 list-inside list-disc text-destructive/90">
                {formErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label className="mb-2">Current Role</Label>
              <Input type="text" value={user?.role || 'Checker'} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label className="mb-2">Client Name <span className="text-destructive">*</span></Label>
              <Select
                value={formData.selectedClient}
                onValueChange={(value) => handleInputChange('selectedClient', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2">Client Branch(es) <span className="text-destructive">*</span></Label>
              {!formData.selectedClient ? (
                <Input type="text" value="Please select a client first" readOnly className="bg-muted/50 text-muted-foreground" />
              ) : (
                <Popover open={showBranchDropdown} onOpenChange={setShowBranchDropdown}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between font-normal">
                      <span className="truncate">{branchLabel}</span>
                      <ChevronDown className="size-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0">
                    <ScrollArea className="h-60">
                      <div className="p-1">
                        {branchOptions.map(branch => (
                          <label
                            key={branch}
                            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={formData.selectedBranches.includes(branch)}
                              onCheckedChange={() => toggleBranch(branch)}
                            />
                            {branch}
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex items-center justify-between border-t p-2">
                      <span className="text-xs text-muted-foreground">
                        {formData.selectedBranches.length} of {branchOptions.length} selected
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            selectedBranches: prev.selectedBranches.length === branchOptions.length ? [] : [...branchOptions],
                          }))}
                        >
                          {formData.selectedBranches.length === branchOptions.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        <Button type="button" size="sm" onClick={() => setShowBranchDropdown(false)}>
                          Done
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {formData.selectedBranches.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.selectedBranches.includes('Pan India') ? (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Pan India
                      <button type="button" onClick={() => toggleBranch('Pan India')} className="ml-1 rounded-full hover:bg-foreground/10">
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ) : (
                    formData.selectedBranches.map((branch, index) => {
                      const branchName = typeof branch === 'string' ? branch : branch.name;
                      return (
                        <Badge key={typeof branch === 'string' ? branch : `branch-${index}`} variant="secondary" className="gap-1 pr-1">
                          {BRANCH_LABELS[branchName] || branchName}
                          <button type="button" onClick={() => toggleBranch(branchName)} className="ml-1 rounded-full hover:bg-foreground/10">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {expiryAlert && (
          <Card className={expiryAlert.tone === 'destructive' ? 'border-destructive/40 bg-destructive/5' : 'border-amber-400/40 bg-amber-50 dark:bg-amber-500/10'}>
            <CardContent className="flex gap-3 pt-4">
              <AlertTriangle className={cn('mt-0.5 size-5 shrink-0', expiryAlert.tone === 'destructive' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400')} />
              <div className={cn('text-sm', expiryAlert.tone === 'destructive' ? 'text-destructive' : 'text-amber-800 dark:text-amber-300')}>
                <p><strong>Alert:</strong> {expiryAlert.message}</p>
                <p className="mt-1 text-destructive/90">
                  <strong>Escalation:</strong> At least one document is required (LOI, WO, PO, or Email Approval)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Uploads */}
        <Card>
          <CardHeader>
            <CardTitle>Document Uploads</CardTitle>
            <CardDescription>Upload at least one of the following documents: LOI, WO, PO, or Email Approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">Agreement Duration</h3>
              <label className="mb-4 flex items-center gap-2">
                <Checkbox
                  checked={formData?.openAgreement || false}
                  onCheckedChange={(checked) => handleInputChange('openAgreement', !!checked)}
                />
                <span className="text-sm font-medium text-foreground">Open Agreement (No End Date)</span>
              </label>
              <p className="mb-4 text-xs text-muted-foreground">
                {formData?.openAgreement ? "Only 'From Date' is required" : "Both 'From Date' and 'To Date' are required"}
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DateField
                  label="From Date"
                  required
                  value={formData?.startDate}
                  onChange={(value) => handleInputChange('startDate', value)}
                />
                {!formData?.openAgreement && (
                  <DateField
                    label="To Date"
                    required
                    minDate={formData?.startDate}
                    value={formData?.endDate}
                    onChange={(value) => handleInputChange('endDate', value)}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(formData.uploadStatuses).map(([type, status]) => (
                <div key={type} className="rounded-lg border-2 border-dashed border-input p-6 text-center">
                  <div className="flex flex-col items-center">
                    <Upload className="mb-3 size-7 text-primary" />
                    <div className="mb-3 text-sm font-medium text-foreground">
                      {UPLOAD_LABELS[type] || type}
                    </div>
                    {status.uploaded ? (
                      <div className="space-y-3">
                        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                          <CheckCircle2 className="size-3.5" />
                          {status.file?.name || 'File uploaded'}
                        </Badge>
                        <div className="flex justify-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openStoredFile(status.file)}
                          >
                            <Eye className="size-4" /> View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              uploadStatuses: { ...prev.uploadStatuses, [type]: { uploaded: false, file: null } },
                            }))}
                          >
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(type, e.target.files[0])}
                          className="hidden"
                          id={`upload-${type}`}
                          accept=".pdf,.docx,.jpg,.jpeg,.png"
                        />
                        <label htmlFor={`upload-${type}`} className={cn(buttonVariants({ size: 'sm' }), 'cursor-pointer')}>
                          Choose File
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Max size: 10MB — Allowed: pdf, docx, jpg, jpeg, png
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              rows={4}
              placeholder="Add any additional remarks..."
            />
          </CardContent>
        </Card>

        {/* Entity Type */}
        <Card>
          <CardHeader>
            <CardTitle>Entity Type</CardTitle>
            <CardDescription>Specify if this is a single entity or group agreement.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.entityType}
              onValueChange={(value) => handleInputChange('entityType', value)}
              className="flex flex-row gap-6"
            >
              <label className="flex items-center gap-2">
                <RadioGroupItem value="single" />
                <span className="text-sm font-medium text-foreground">Single Entity</span>
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="multiple" />
                <span className="text-sm font-medium text-foreground">Single Entity with Group Companies</span>
              </label>
            </RadioGroup>

            {formData.entityType === 'multiple' && (
              <div className="mt-4 space-y-2">
                {formData.groupCompanies.map((company, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={company}
                      onChange={(e) => updateGroupCompany(index, e.target.value)}
                      placeholder="Under list/annexure"
                    />
                    {formData.groupCompanies.length > 1 && (
                      <Button type="button" size="icon-sm" variant="destructive" onClick={() => removeGroupCompany(index)}>
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={addGroupCompany}>
                  <Plus className="size-4" /> Add Company
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agreement Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Agreement Type Selection</CardTitle>
            <CardDescription>Identify the origin of the agreement draft.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.agreementType}
              onValueChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  agreementType: value,
                  clientDraftFile: value === 'Client Draft' ? prev.clientDraftFile : { uploaded: false, file: null },
                }));
              }}
              className="flex flex-row gap-6"
            >
              {agreementTypeOptions.map(type => (
                <label key={type} className="flex items-center gap-2">
                  <RadioGroupItem value={type} />
                  <span className="text-sm font-medium text-foreground">{type}</span>
                </label>
              ))}
            </RadioGroup>

            {formData.agreementType === 'Client Draft' && (
              <div className="mt-4 rounded-lg border-2 border-dashed border-input p-4">
                <div className="mb-2 text-sm font-medium text-foreground">Upload Client Draft</div>
                {formData.clientDraftFile?.uploaded ? (
                  <div className="space-y-2">
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                      <CheckCircle2 className="size-3.5" />
                      {formData.clientDraftFile.file?.name || 'File uploaded'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openStoredFile(formData.clientDraftFile?.file)}
                      >
                        <Eye className="size-4" /> View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setFormData(prev => ({ ...prev, clientDraftFile: { uploaded: false, file: null } }))}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      onChange={(e) => handleClientDraftUpload(e.target.files[0])}
                      className="hidden"
                      id="upload-client-draft"
                      accept=".pdf,.doc,.docx"
                    />
                    <label htmlFor="upload-client-draft" className={cn(buttonVariants({ size: 'sm' }), 'cursor-pointer')}>
                      Choose Client Draft
                    </label>
                    <p className="mt-2 text-xs text-muted-foreground">Allowed: pdf, doc, docx</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Clauses */}
        <Card>
          <CardHeader>
            <CardTitle>Important Clauses</CardTitle>
            <CardDescription>Add important clauses and supporting documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(formData.importantClauses || []).map((clause, index) => (
              <Card key={index} size="sm">
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Clause {index + 1}</h3>
                    <Button type="button" size="icon-sm" variant="destructive" onClick={() => removeClause(index)}>
                      <X className="size-4" />
                    </Button>
                  </div>

                  <Input
                    type="text"
                    value={clause.title}
                    onChange={(e) => updateClause(index, 'title', e.target.value)}
                    placeholder="Enter clause title..."
                  />

                  <div>
                    {!clause.file ? (
                      <div>
                        <input
                          type="file"
                          onChange={(e) => handleClauseFileUpload(index, e.target.files[0])}
                          className="hidden"
                          id={`clause-file-${index}`}
                          accept=".pdf,.doc,.docx"
                        />
                        <label htmlFor={`clause-file-${index}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'cursor-pointer')}>
                          <Upload className="size-4" /> Upload File
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <label htmlFor={`clause-file-${index}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'cursor-pointer')}>
                          <Upload className="size-4" /> Change File
                        </label>
                        <input
                          type="file"
                          onChange={(e) => handleClauseFileUpload(index, e.target.files[0])}
                          className="hidden"
                          id={`clause-file-${index}`}
                          accept=".pdf,.doc,.docx"
                        />
                        <span className="truncate text-xs text-muted-foreground">{clause.file.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="link"
                          className="h-auto px-0"
                          onClick={() => openStoredFile(clause.file)}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="link"
                          className="h-auto px-0 text-destructive"
                          onClick={() => updateClause(index, 'file', null)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  <Textarea
                    value={clause.content}
                    onChange={(e) => updateClause(index, 'content', e.target.value)}
                    rows={3}
                    placeholder="Enter clause details..."
                  />
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addClause}>
              <Plus className="size-4" /> Add Clause
            </Button>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Contact details for I Smart and Client</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* I Smart Section */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <Badge variant="outline" className="border-primary/40 px-4 py-1 text-primary">I Smart</Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="mb-2">Name</Label>
                  <Input
                    type="text"
                    value={safeGet(formData, 'contactInfo.name')}
                    onChange={(e) => handleInputChange('contactInfo', { ...(formData.contactInfo || {}), name: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <Label className="mb-2">Phone <span className="text-destructive">*</span></Label>
                  <Input
                    type="tel"
                    value={safeGet(formData, 'contactInfo.phone')}
                    aria-invalid={!!validationErrors.phone}
                    onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), phone: e.target.value });
                      if (validationErrors.phone) {
                        setValidationErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    onBlur={() => {
                      const phone = safeGet(formData, 'contactInfo.phone');
                      if (phone && !validatePhone(phone)) {
                        setValidationErrors(prev => ({ ...prev, phone: 'Please enter a valid 10-digit phone number starting with 6-9' }));
                      }
                    }}
                    placeholder="Enter phone number"
                  />
                  {validationErrors.phone && <p className="mt-1 text-sm text-destructive">{validationErrors.phone}</p>}
                </div>

                <div>
                  <Label className="mb-2">Email <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    value={safeGet(formData, 'contactInfo.email')}
                    aria-invalid={!!validationErrors.email}
                    onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), email: e.target.value });
                      if (validationErrors.email) {
                        setValidationErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    onBlur={() => {
                      const email = safeGet(formData, 'contactInfo.email');
                      if (email && !validateEmail(email)) {
                        setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g., user@example.com)' }));
                      }
                    }}
                    placeholder="Enter email"
                  />
                  {validationErrors.email && <p className="mt-1 text-sm text-destructive">{validationErrors.email}</p>}
                </div>
              </div>
            </div>

            {/* Client Section */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <Badge variant="outline" className="border-primary/40 px-4 py-1 text-primary">Client</Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="mb-2">Name</Label>
                  <Input
                    type="text"
                    value={safeGet(formData, 'contactInfo.clientName')}
                    onChange={(e) => handleInputChange('contactInfo', { ...(formData.contactInfo || {}), clientName: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <Label className="mb-2">Phone <span className="text-destructive">*</span></Label>
                  <Input
                    type="tel"
                    value={safeGet(formData, 'contactInfo.clientPhone')}
                    aria-invalid={!!validationErrors.clientPhone}
                    onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), clientPhone: e.target.value });
                      if (validationErrors.clientPhone) {
                        setValidationErrors(prev => ({ ...prev, clientPhone: '' }));
                      }
                    }}
                    onBlur={() => {
                      const clientPhone = safeGet(formData, 'contactInfo.clientPhone');
                      if (clientPhone && !validatePhone(clientPhone)) {
                        setValidationErrors(prev => ({ ...prev, clientPhone: 'Please enter a valid 10-digit phone number starting with 6-9' }));
                      }
                    }}
                    placeholder="Enter phone number"
                  />
                  {validationErrors.clientPhone && <p className="mt-1 text-sm text-destructive">{validationErrors.clientPhone}</p>}
                </div>

                <div>
                  <Label className="mb-2">Email <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    value={safeGet(formData, 'contactInfo.clientEmail')}
                    aria-invalid={!!validationErrors.clientEmail}
                    onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), clientEmail: e.target.value });
                      if (validationErrors.clientEmail) {
                        setValidationErrors(prev => ({ ...prev, clientEmail: '' }));
                      }
                    }}
                    onBlur={() => {
                      const clientEmail = safeGet(formData, 'contactInfo.clientEmail');
                      if (clientEmail && !validateEmail(clientEmail)) {
                        setValidationErrors(prev => ({ ...prev, clientEmail: 'Please enter a valid email address (e.g., user@example.com)' }));
                      }
                    }}
                    placeholder="Enter email"
                  />
                  {validationErrors.clientEmail && <p className="mt-1 text-sm text-destructive">{validationErrors.clientEmail}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {!isEditing && drafts.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">Saved drafts:</span>
                {drafts.map((draft) => (
                  <Badge key={draft.id} variant={formData.id === draft.id ? 'secondary' : 'outline'} className="gap-1 pr-1">
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      onClick={() => runGuarded(() => loadIntoForm(normalizeAgreement(draft)))}
                    >
                      <FileText className="size-3.5" />
                      {draft.draftName || 'Untitled Draft'}
                    </button>
                    <button
                      type="button"
                      className="ml-1 rounded-full hover:bg-foreground/10"
                      aria-label={`Delete draft ${draft.draftName || 'Untitled Draft'}`}
                      onClick={() => handleDeleteDraft(draft)}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </>
            )}
          </div>

          <div className="flex gap-3">
            {!isEditing && (
              <Button type="button" variant="outline" onClick={handleSaveDraft}>
                Save Draft
              </Button>
            )}
            <Button type="button" onClick={handleSubmit}>
              {isEditing && formData?.isRenewal ? 'Update Agreement' : 'Submit for Review'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => runGuarded(() => {
                  dispatch(setEditingAgreement(null));
                  dispatch(setActiveTab('agreements'));
                })}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </div>
      </form>

      <UnsavedChangesDialog
        open={!!pendingAction}
        onCancel={() => setPendingAction(null)}
        onDiscard={() => {
          pendingAction();
          setPendingAction(null);
        }}
      />
    </div>
  );
};

export default AgreementForm;
