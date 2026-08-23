import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate a GSA-style branded PDF report.
 * 
 * @param {Object} options
 * @param {string} options.title - Report title
 * @param {Object} options.stats - Summary statistics object
 * @param {string} options.type - 'aoi' or 'selection'
 * @param {string[]} options.selectedCities - Names of selected cities
 * @param {HTMLElement} options.chartsElement - The GSAReportTemplate DOM element containing the pages
 */
export const generateReport = async ({ title, stats, type, selectedCities, chartsElement }) => {
  if (!chartsElement) {
    console.error('No template element provided for PDF generation');
    return;
  }

  // Find all page containers
  const pages = chartsElement.querySelectorAll('.gsa-page-container');
  if (pages.length === 0) {
    console.error('No pages found in the template');
    return;
  }

  // Create A4 PDF (210mm x 297mm)
  const doc = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const pageElement = pages[i];

    // Add new page if not the first one
    if (i > 0) {
      doc.addPage();
    }

    try {
      const canvas = await html2canvas(pageElement, {
        scale: 4, // high res
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // The template is designed for A4 proportions (794x1123).
      // We can map it directly to the A4 pdfWidth and pdfHeight.
      doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    } catch (err) {
      console.warn(`Failed to capture page ${i + 1}:`, err);
    }
  }

  // Save PDF
  const fileName = type === 'aoi'
    ? `HeraldX_Report_${selectedCities?.join('_') || 'All'}_${Date.now()}.pdf`
    : `HeraldX_Selection_Report_${Date.now()}.pdf`;

  doc.save(fileName);
};
