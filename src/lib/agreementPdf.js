import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./dates";

export const getBranchNames = (agreement) => {
  if (!agreement.selectedBranches || agreement.selectedBranches.length === 0) {
    return "No branches specified";
  }
  return agreement.selectedBranches.map((branch) => (typeof branch === "string" ? branch : branch.name)).join(", ");
};

export function downloadAgreementPdf(agreement) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Agreement - ${agreement.selectedClient || "Untitled"}`, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${formatDate(new Date())}`, 14, 24);

  autoTable(doc, {
    startY: 30,
    theme: "grid",
    head: [["Field", "Value"]],
    body: [
      ["Agreement ID", agreement.id || "N/A"],
      ["Client", agreement.selectedClient || "N/A"],
      ["Branches", getBranchNames(agreement)],
      ["Department", agreement.selectedDepartment || "N/A"],
      ["Agreement Type", agreement.agreementType || "N/A"],
      ["Status", agreement.status || "N/A"],
      ["Priority", agreement.priority || "N/A"],
      ["Start Date", formatDate(agreement.startDate)],
      ["End Date", agreement.openAgreement ? "Open agreement" : formatDate(agreement.endDate)],
      ["Total Value", agreement.totalValue ? `${agreement.currency || ""} ${agreement.totalValue}` : "N/A"],
      ["Submitted Date", formatDate(agreement.submittedDate)],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 } },
  });

  const contact = agreement.contactInfo || {};
  autoTable(doc, {
    theme: "grid",
    head: [["Contact Info", "Value"]],
    body: [
      ["Internal Owner", contact.name || "N/A"],
      ["Internal Email", contact.email || "N/A"],
      ["Internal Phone", contact.phone || "N/A"],
      ["Client Contact", contact.clientName || "N/A"],
      ["Client Email", contact.clientEmail || "N/A"],
      ["Client Phone", contact.clientPhone || "N/A"],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 } },
  });

  const clauses = (agreement.importantClauses || []).filter((clause) => clause.content || clause.placeholder || clause.file);
  if (clauses.length > 0) {
    autoTable(doc, {
      theme: "grid",
      head: [["Clause", "Details", "Document"]],
      body: clauses.map((clause) => [
        clause.title || "Untitled clause",
        clause.content || clause.placeholder || "",
        clause.file?.name || "",
      ]),
    });
  }

  const documents = Object.entries(agreement.uploadStatuses || {}).filter(([, slot]) => slot?.uploaded);
  if (documents.length > 0) {
    autoTable(doc, {
      theme: "grid",
      head: [["Document", "File"]],
      body: documents.map(([type, slot]) => [type, slot.file?.name || "Uploaded"]),
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 } },
    });
  }

  const safeClient = (agreement.selectedClient || "agreement").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`${safeClient}_Agreement_${new Date().toISOString().split("T")[0]}.pdf`);
}
