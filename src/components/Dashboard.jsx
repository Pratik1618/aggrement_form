import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { differenceInCalendarDays, format } from "date-fns";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlarmClock,
  FileEdit,
  CalendarCheck,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Eye,
  Download,
  Plus,
  ArrowRight,
} from "lucide-react";
import { setEditingAgreement, setActiveTab, setViewModal } from "../slice/uiSlice";
import { generateNotifications } from "../slice/notificationsSlice";
import { downloadAgreementPdf, getBranchNames } from "../lib/agreementPdf";
import { formatDate, toDate } from "../lib/dates";
import { statusBadgeClass } from "../lib/status";
import ExpiringContractModal from "./ExpiringContractModal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const EXPIRY_WINDOW_DAYS = 30;
const PENDING_STATUSES = ["Execution Pending", "Under Review", "Pending Review"];
const PROCESSED_STATUSES = ["Approved", "Executed", "Rejected"];

const EXPIRY_URGENCY_CLASSES = {
  Expired: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  Critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  Urgent: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
};

const DEFAULT_CLAUSE_TITLES = [
  "Term and termination (Duration)",
  "Payment Terms",
  "Penalty",
  "Minimum Wages",
  "Costing - Salary Breakup",
  "SLA",
  "Indemnity",
  "Insurance",
];

const emptyClauses = () => DEFAULT_CLAUSE_TITLES.map((title) => ({ title, content: "", file: null }));

const emptyContactInfo = () => ({
  name: "",
  email: "",
  phone: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  ismartName: "",
  ismartEmail: "",
  ismartPhone: "",
});

const getDaysUntilExpiry = (endDate) => differenceInCalendarDays(toDate(endDate), new Date());

const getExpiryUrgency = (days) => {
  if (days < 0) return "Expired";
  if (days <= 7) return "Critical";
  if (days <= 14) return "Urgent";
  return "Warning";
};

const getExpiryLabel = (days) => {
  if (days < 0) return `Expired ${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"} left`;
};

function StatCard({ label, value, hint, icon, alert = false }) {
  const Icon = icon;
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`mt-1 text-2xl font-semibold ${alert && value > 0 ? "text-destructive" : "text-foreground"}`}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function ExpiryAlertBanner({ expiredCount, expiringCount, criticalCount, onViewAll }) {
  if (expiredCount === 0 && expiringCount === 0) return null;

  const parts = [];
  if (expiredCount > 0) parts.push(`${expiredCount} contract${expiredCount === 1 ? " has" : "s have"} expired`);
  if (expiringCount > 0) parts.push(`${expiringCount} expiring within ${EXPIRY_WINDOW_DAYS} days`);

  const isSevere = expiredCount > 0 || criticalCount > 0;

  return (
    <div
      role="status"
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
        isSevere
          ? "border-destructive/30 bg-destructive/5"
          : "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={`size-5 shrink-0 ${isSevere ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`} />
        <div>
          <p className="text-sm font-medium text-foreground">{parts.join(", ")}</p>
          {criticalCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {criticalCount} need{criticalCount === 1 ? "s" : ""} attention within 7 days
            </p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onViewAll}>
        View agreements
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function PageHeading({ name, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome back, {name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard({ onNavigateToAgreements }) {
  const dispatch = useDispatch();

  const agreements = useSelector(state => state.agreements.agreements);
  const addendums = useSelector(state => state.addendums.addendums);
  const user = useSelector(state => state.user);

  const agreementsList = agreements || [];
  const addendumsList = addendums || [];

  const [viewingExpiringContract, setViewingExpiringContract] = useState(null);
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    if (agreements?.length > 0) {
      dispatch(generateNotifications({ agreements }));
    }
  }, [agreements, dispatch]);

  const handleViewAgreement = (agreement) => {
    dispatch(setViewModal({ open: true, agreement }));
  };

  const handleEditAgreement = (agreement) => {
    dispatch(setEditingAgreement({
      ...agreement,
      selectedDepartment: agreement.selectedDepartment || "",
      agreementType: agreement.agreementType || "Client Draft",
      startDate: agreement.startDate || new Date().toISOString().split("T")[0],
      openAgreement: agreement.openAgreement || false,
      remarks: agreement.remarks || "",
      entityType: agreement.entityType || "single",
      groupCompanies: agreement.groupCompanies || [""],
      importantClauses: agreement.importantClauses || emptyClauses(),
      contactInfo: agreement.contactInfo || emptyContactInfo(),
    }));
    dispatch(setActiveTab("new"));
  };

  const handleRenewAgreement = (agreement) => {
    // A long-expired contract must still renew to an end date after the new start date.
    const renewFrom = Math.max(toDate(agreement.endDate)?.getTime() || 0, Date.now());
    const newEndDate = new Date(renewFrom + 365 * 24 * 60 * 60 * 1000);

    setIsRenewing(true);
    dispatch(setEditingAgreement({
      ...agreement,
      startDate: new Date().toISOString().split("T")[0],
      endDate: format(newEndDate, "yyyy-MM-dd"),
      isRenewal: true,
      originalAgreementId: agreement.id,
      renewalDate: new Date().toISOString(),
      remarks: `Renewal of agreement ${agreement.id} - ${agreement.remarks || ""}`,
      uploadStatuses: {
        LOI: { uploaded: false, file: null },
        WO: { uploaded: false, file: null },
        PO: { uploaded: false, file: null },
        EmailApproval: { uploaded: false, file: null },
      },
      selectedDepartment: agreement.selectedDepartment || "",
      agreementType: agreement.agreementType || "Client Draft",
      openAgreement: agreement.openAgreement || false,
      entityType: agreement.entityType || "single",
      groupCompanies: agreement.groupCompanies || [""],
      selectedBranches: Array.isArray(agreement.selectedBranches)
        ? agreement.selectedBranches.map((branch) => (typeof branch === "string" ? branch : branch.name))
        : [],
      importantClauses: agreement.importantClauses || emptyClauses(),
      contactInfo: agreement.contactInfo || emptyContactInfo(),
    }));

    requestAnimationFrame(() => {
      dispatch(setActiveTab("new"));
      setIsRenewing(false);
    });
  };

  const contractsNeedingAttention = agreementsList
    .filter((agreement) => (
      !agreement.openAgreement &&
      toDate(agreement.endDate) &&
      getDaysUntilExpiry(agreement.endDate) <= EXPIRY_WINDOW_DAYS
    ))
    .sort((a, b) => getDaysUntilExpiry(a.endDate) - getDaysUntilExpiry(b.endDate));

  const expiredCount = contractsNeedingAttention.filter((a) => getDaysUntilExpiry(a.endDate) < 0).length;
  const expiringCount = contractsNeedingAttention.length - expiredCount;
  const criticalCount = contractsNeedingAttention.filter((a) => {
    const days = getDaysUntilExpiry(a.endDate);
    return days >= 0 && days <= 7;
  }).length;

  const pendingAgreements = agreementsList.filter((a) => PENDING_STATUSES.includes(a.status));
  const contractsWithAddendums = agreementsList.filter((agreement) =>
    addendumsList.some((addendum) => addendum.parentAgreementId === agreement.id)
  ).length;

  const banner = (
    <ExpiryAlertBanner
      expiredCount={expiredCount}
      expiringCount={expiringCount}
      criticalCount={criticalCount}
      onViewAll={onNavigateToAgreements}
    />
  );

  const expiringCard = (
    <Card>
      <CardHeader>
        <CardTitle>Contract Expiry</CardTitle>
        <CardDescription>Expired contracts and those ending within {EXPIRY_WINDOW_DAYS} days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {contractsNeedingAttention.length === 0 && <EmptyState>No contracts need attention right now</EmptyState>}
        {contractsNeedingAttention.map((agreement) => {
          const days = getDaysUntilExpiry(agreement.endDate);
          const urgency = getExpiryUrgency(days);

          return (
            <div key={agreement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{agreement.selectedClient}</h3>
                  {agreement.isRenewal && (
                    <Badge variant="outline" className="gap-1">
                      <RefreshCw className="size-3" />
                      Renewal
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{getBranchNames(agreement)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ends {formatDate(agreement.endDate)} • {getExpiryLabel(days)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={EXPIRY_URGENCY_CLASSES[urgency]}>{urgency}</Badge>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label={`View ${agreement.selectedClient} expiry details`}
                  title="View"
                  onClick={() => setViewingExpiringContract(agreement)}
                >
                  <Eye className="size-4" />
                </Button>
                {user.role === "Checker" && (
                  <Button size="sm" disabled={isRenewing} onClick={() => handleRenewAgreement(agreement)}>
                    {isRenewing ? "Renewing..." : "Renew"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  const expiryModal = (
    <ExpiringContractModal
      open={!!viewingExpiringContract}
      agreement={viewingExpiringContract}
      onClose={() => setViewingExpiringContract(null)}
    />
  );

  if (user.role === "Approver") {
    const today = new Date();
    const approvedToday = agreementsList.filter((a) => {
      const approvedOn = toDate(a.approvedDate);
      return approvedOn && differenceInCalendarDays(approvedOn, today) === 0;
    }).length;
    const totalProcessed = agreementsList.filter((a) => PROCESSED_STATUSES.includes(a.status)).length;

    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeading
          name={user.name}
          subtitle="Here is what needs your review today."
          action={<Button onClick={onNavigateToAgreements}>Review agreements <ArrowRight className="size-4" /></Button>}
        />
        {banner}

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Pending Approval" value={pendingAgreements.length} icon={Clock} />
          <StatCard label="Approved Today" value={approvedToday} icon={CalendarCheck} />
          <StatCard label="Total Processed" value={totalProcessed} icon={BarChart3} />
          <StatCard label="Expired" value={expiredCount} icon={AlertTriangle} alert />
          <StatCard label="Expiring Soon" value={expiringCount} icon={AlarmClock} />
          <StatCard label="Total Addendums" value={addendumsList.length} hint={`Across ${contractsWithAddendums} contracts`} icon={FileText} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Priority Actions</CardTitle>
              <CardDescription>Agreements requiring your review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAgreements.length === 0 && <EmptyState>No pending agreements</EmptyState>}
              {pendingAgreements.map((agreement) => (
                <div key={agreement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{agreement.selectedClient}</h3>
                    <p className="text-sm text-muted-foreground">{getBranchNames(agreement)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDate(agreement.submittedDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusBadgeClass(agreement.status)}>{agreement.status}</Badge>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={`View ${agreement.selectedClient}`}
                      title="View"
                      onClick={() => handleViewAgreement(agreement)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {expiringCard}
        </div>
        {expiryModal}
      </div>
    );
  }

  const recentSubmissions = [...agreementsList]
    .sort((a, b) => (toDate(b.submittedDate)?.getTime() || 0) - (toDate(a.submittedDate)?.getTime() || 0))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeading
        name={user.name}
        subtitle="Track your submissions and upcoming contract expiries."
        action={<Button onClick={() => dispatch(setActiveTab("new"))}><Plus className="size-4" /> New agreement</Button>}
      />
      {banner}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Submissions" value={agreementsList.length} icon={FileText} />
        <StatCard label="Pending Review" value={pendingAgreements.length} icon={Clock} />
        <StatCard label="Approved" value={agreementsList.filter((a) => a.status === "Approved").length} icon={CheckCircle2} />
        <StatCard label="Rejected" value={agreementsList.filter((a) => a.status === "Rejected").length} icon={XCircle} alert />
        <StatCard label="Expiring Soon" value={expiringCount} icon={AlarmClock} />
        <StatCard label="Total Addendums" value={addendumsList.length} hint={`Across ${contractsWithAddendums} contracts`} icon={FileEdit} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Your latest agreement submissions and their approval status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSubmissions.length === 0 && <EmptyState>No submissions yet</EmptyState>}
            {recentSubmissions.map((agreement, index) => (
              <div key={agreement.id || index} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{agreement.selectedClient || `Client ${index + 1}`}</h3>
                  <p className="text-sm text-muted-foreground">{getBranchNames(agreement)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDate(agreement.submittedDate)}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={statusBadgeClass(agreement.status || "Pending Review")}>
                    {agreement.status || "Pending Review"}
                  </Badge>
                  <Button size="icon-sm" variant="outline" aria-label="View agreement" title="View" onClick={() => handleViewAgreement(agreement)}>
                    <Eye className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="outline" aria-label="Edit agreement" title="Edit" onClick={() => handleEditAgreement(agreement)}>
                    <FileEdit className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="outline" aria-label="Download agreement as PDF" title="Download PDF" onClick={() => downloadAgreementPdf(agreement)}>
                    <Download className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {expiringCard}
      </div>
      {expiryModal}
    </div>
  );
}
