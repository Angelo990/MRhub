import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ExportValue = string | number | null | undefined;

type ExportRow = Record<string, ExportValue>;

export function exportRowsToExcel(rows: ExportRow[], sheetName: string, fileName: string) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
}

export function exportRowsToCsv(rows: ExportRow[], fileName: string) {
    if (rows.length === 0) {
        return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
}

export function exportRowsToPdf(title: string, meta: Array<{ label: string; value: string | number }>, headers: string[], rows: Array<Array<string | number>>, fileName: string) {
    const document = new jsPDF({ orientation: 'landscape' });

    document.setFontSize(18);
    document.text(title, 14, 18);

    let currentY = 28;
    document.setFontSize(10);

    meta.forEach(({ label, value }) => {
        document.text(`${label}: ${value}`, 14, currentY);
        currentY += 6;
    });

    autoTable(document, {
        head: [headers],
        body: rows,
        startY: currentY + 4,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39] },
    });

    document.save(fileName);
}

export function printHtmlDocument(title: string, body: string) {
    const printWindow = window.open('', '_blank', 'width=1024,height=768');

    if (!printWindow) {
        return;
    }

    const safeTitle = escapeHtml(title);

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>${safeTitle}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 24px;
                        color: #111827;
                    }
                    h1 {
                        font-size: 24px;
                        margin-bottom: 16px;
                    }
                    .meta {
                        margin-bottom: 16px;
                    }
                    .meta p {
                        margin: 4px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 16px;
                    }
                    th, td {
                        border: 1px solid #d1d5db;
                        padding: 8px;
                        text-align: left;
                        font-size: 12px;
                    }
                    th {
                        background: #f3f4f6;
                    }
                    .summary {
                        margin-top: 16px;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>${body}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function escapeCsvValue(value: ExportValue) {
    const stringValue = value == null ? '' : String(value);
    const safeValue = typeof value === 'string' && /^[=+\-@]/.test(stringValue) ? `'${stringValue}` : stringValue;

    if (safeValue.includes(',') || safeValue.includes('"') || safeValue.includes('\n')) {
        return `"${safeValue.replace(/"/g, '""')}"`;
    }

    return safeValue;
}

export function escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}