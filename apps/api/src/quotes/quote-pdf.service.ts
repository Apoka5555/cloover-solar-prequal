import { Injectable } from '@nestjs/common';
import {
  formatEur,
  formatPercent,
  type AmortizationScheduleDto,
  type QuoteDto,
} from '@cloover/contracts';
// Renamed from the default export, which shares a name with pdfkit's
// named export and reads ambiguously otherwise.
import PdfKit from 'pdfkit';

const PAGE_MARGIN = 48;
const INK = '#2b3a36';
const MUTED = '#6b7a75';
const BRAND = '#1f6f5c';
const RULE = '#d9e2df';

/**
 * PDFKit's built-in fonts use WinAnsi, where a non-breaking space has no
 * glyph. Intl inserts one before the currency symbol, so it is normalised to
 * an ordinary space.
 */
function printable(value: string): string {
  return value.replace(/ /g, ' ');
}

const euros = (value: number) => printable(formatEur(value));
const percent = (value: number) => printable(formatPercent(value));

interface Column {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

/**
 * Renders a quote as a document the customer can keep or forward.
 *
 * The figures are read from the stored quote rather than recomputed, so an
 * exported document always matches what was shown on screen and what is
 * recorded in the database.
 */
@Injectable()
export class QuotePdfService {
  render(quote: QuoteDto, schedule?: AmortizationScheduleDto): Promise<Buffer> {
    const doc = new PdfKit({
      size: 'A4',
      margin: PAGE_MARGIN,
      // Keeps every page in memory so the footer can be stamped on all of
      // them once the page count is known.
      bufferPages: true,
      info: {
        Title: `Cloover pre-qualification ${quote.id}`,
        Author: 'Cloover',
        Subject: 'Residential solar financing pre-qualification',
      },
    });

    const chunks: Buffer[] = [];
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.writeHeader(doc, quote);
    this.writeSummary(doc, quote);
    this.writeOffers(doc, quote);

    if (schedule) {
      this.writeSchedule(doc, schedule);
    }

    this.writeFooter(doc, quote);
    doc.flushPages();
    doc.end();

    return finished;
  }

  private writeHeader(doc: PDFKit.PDFDocument, quote: QuoteDto): void {
    doc
      .fillColor(BRAND)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('CLOOVER', { characterSpacing: 2 });
    doc.fillColor(INK).fontSize(20).text('Solar financing pre-qualification', { paragraphGap: 4 });
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Issued ${new Date(quote.createdAt).toISOString().slice(0, 10)}  ·  Reference ${quote.id}`,
      );

    doc.moveDown(1);
    this.rule(doc);
    doc.moveDown(0.8);
  }

  private writeSummary(doc: PDFKit.PDFDocument, quote: QuoteDto): void {
    const rows: [string, string][] = [
      ['Applicant', quote.input.fullName],
      ['Email', quote.input.email],
      ['Installation address', quote.input.address],
      ['Monthly consumption', `${quote.input.monthlyConsumptionKwh} kWh`],
      ['System size', `${quote.input.systemSizeKw} kW`],
      ['System price', euros(quote.derived.systemPrice)],
      ['Down payment', euros(quote.derived.downPayment)],
      ['Amount financed', euros(quote.derived.principal)],
      ['Risk band', `${quote.derived.riskBand} — ${percent(quote.derived.apr)} APR`],
    ];

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('Summary');
    doc.moveDown(0.4);

    for (const [label, value] of rows) {
      const top = doc.y;
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(MUTED)
        .text(label, PAGE_MARGIN, top, { width: 160 });
      doc
        .font('Helvetica-Bold')
        .fillColor(INK)
        .text(printable(value), PAGE_MARGIN + 170, top, { width: 330 });
      doc.moveDown(0.25);
    }

    // The value column left the cursor indented; everything after this starts
    // at the margin again.
    doc.x = PAGE_MARGIN;
    doc.moveDown(0.8);
  }

  private writeOffers(doc: PDFKit.PDFDocument, quote: QuoteDto): void {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('Instalment offers');
    doc.moveDown(0.2);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text('A longer term lowers the monthly payment and raises the total cost of borrowing.');
    doc.moveDown(0.5);

    const columns: Column[] = [
      { label: 'Term', width: 70 },
      { label: 'Rate', width: 60 },
      { label: 'Financed', width: 90, align: 'right' },
      { label: 'Monthly', width: 90, align: 'right' },
      { label: 'Total repaid', width: 95, align: 'right' },
      { label: 'Interest', width: 94, align: 'right' },
    ];

    this.tableHeader(doc, columns);

    for (const offer of quote.offers) {
      this.tableRow(doc, columns, [
        `${offer.termYears} years`,
        percent(offer.apr),
        euros(offer.principalUsed),
        euros(offer.monthlyPayment),
        euros(offer.totalPaid),
        euros(offer.totalInterest),
      ]);
    }

    doc.moveDown(1);
  }

  private writeSchedule(doc: PDFKit.PDFDocument, schedule: AmortizationScheduleDto): void {
    doc.addPage();

    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Payment schedule — ${schedule.termYears} years at ${percent(schedule.apr)}`);
    doc.moveDown(0.2);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(
        `${schedule.rows.length} instalments of ${euros(schedule.monthlyPayment)}. ` +
          `Total repaid ${euros(schedule.totalPaid)}, of which ${euros(schedule.totalInterest)} is interest.`,
      );
    doc.moveDown(0.5);

    const columns: Column[] = [
      { label: 'No.', width: 50 },
      { label: 'Payment', width: 110, align: 'right' },
      { label: 'Interest', width: 110, align: 'right' },
      { label: 'Principal', width: 110, align: 'right' },
      { label: 'Balance', width: 119, align: 'right' },
    ];

    this.tableHeader(doc, columns);

    for (const row of schedule.rows) {
      // Repeat the header whenever the table runs onto a new page, so a
      // printed page is readable on its own.
      if (doc.y > doc.page.height - PAGE_MARGIN - 24) {
        doc.addPage();
        this.tableHeader(doc, columns);
      }

      this.tableRow(doc, columns, [
        String(row.period),
        euros(row.payment),
        euros(row.interest),
        euros(row.principal),
        euros(row.remainingBalance),
      ]);
    }
  }

  private writeFooter(doc: PDFKit.PDFDocument, quote: QuoteDto): void {
    const pages = doc.bufferedPageRange();
    const notice = `Indicative pre-qualification only, not a credit offer. Pricing rules ${quote.derived.pricingVersion}.`;

    for (let index = pages.start; index < pages.start + pages.count; index += 1) {
      doc.switchToPage(index);

      // Writing inside the bottom margin would otherwise make PDFKit start a
      // new page, one per page stamped.
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(notice, PAGE_MARGIN, doc.page.height - 32, {
          width: doc.page.width - PAGE_MARGIN * 2,
          align: 'center',
          lineBreak: false,
        });

      doc.page.margins.bottom = bottomMargin;
    }
  }

  private tableHeader(doc: PDFKit.PDFDocument, columns: Column[]): void {
    const top = doc.y;
    let x = PAGE_MARGIN;

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED);
    for (const column of columns) {
      doc.text(column.label.toUpperCase(), x, top, { width: column.width, align: column.align });
      x += column.width;
    }

    doc.y = top + 14;
    this.rule(doc);
    doc.moveDown(0.35);
  }

  private tableRow(doc: PDFKit.PDFDocument, columns: Column[], values: string[]): void {
    const top = doc.y;
    let x = PAGE_MARGIN;

    doc.font('Helvetica').fontSize(9).fillColor(INK);
    for (const [index, column] of columns.entries()) {
      doc.text(values[index] ?? '', x, top, { width: column.width, align: column.align });
      x += column.width;
    }

    doc.y = top + 15;
  }

  private rule(doc: PDFKit.PDFDocument): void {
    doc
      .strokeColor(RULE)
      .lineWidth(0.7)
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .stroke();
  }
}
