import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  OnInit,
  TemplateRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule, MatTable as MatTableDirective } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { FormsModule } from '@angular/forms';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

export interface TableColumn {
  columnDef: string;
  header: string;
  type?: string;
  format?: string;
}

@Component({
  selector: 'app-mat-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTooltipModule,
    FormsModule,
    AppTranslatePipe
  ],
  templateUrl: './mat-table.html',
  styleUrls: ['./mat-table.scss']
})
export class MatTable implements OnInit, AfterViewInit {

  @Input() columns: TableColumn[] = [];
  
  @Input() showAction = true;
  @Input() showEdit = true;
  @Input() showDelete = true;
  @Input() showView = false;
  
  @Input() Extra_Column = false; // Legacy company/roles column
  @Input() extraColumnHeader: string = '';

  // New Enterprise Features
  @Input() showSelection = false;
  @Input() showSearch = false;
  @Input() isLoading = false;
  @Input() title = '';
  @Input() enableExport = true;
  
  @Input() customTemplates: Record<string, TemplateRef<any>> = {};

  @Input() set tableData(value: any[]) {
    this.dataSource.data = value || [];
    this.selection.clear();
    this.refreshView();
  }

  @ViewChild(MatTableDirective) table!: MatTableDirective<any>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  @Output() editClick = new EventEmitter<any>();
  @Output() AddClick = new EventEmitter<any>();
  @Output() ViewClick = new EventEmitter<any>();
  @Output() deleteClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();

  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>();
  @Input() selection = new SelectionModel<any>(true, []);
  searchQuery = '';

  constructor(private cdr: ChangeDetectorRef, private alert: AlertService) { }

  ngOnInit() {
    this.displayedColumns = this.columns.map(x => x.columnDef);

    if (this.Extra_Column) { this.displayedColumns.push('Companies'); }
    if (this.showAction) { this.displayedColumns.push('action'); }
    if (this.showSelection) { this.displayedColumns.unshift('select'); }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.refreshView();
  }

  private refreshView() {
    setTimeout(() => {
      try {
        this.table?.renderRows();
      } catch {}
      this.cdr.detectChanges();
    });
  }

  applyFilter(event: Event | string) {
    const value = typeof event === 'string' ? event : (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  edit(row: any) { this.editClick.emit(row); }
  Add(row: any) { this.AddClick.emit(row); }
  View(row: any) { this.ViewClick.emit(row); }
  delete(row: any) { this.deleteClick.emit(row); }

  // Selection Logic
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.dataSource.data);
    }
    this.selectionChange.emit(this.selection.selected);
  }

  toggleRow(row: any) {
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection.selected);
  }

  getBadgeClass(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'bg-success' : 'bg-error';
    }
    const val = (value || '').toString().toLowerCase().trim();
    if (['pending', 'waiting', 'draft'].includes(val)) return 'bg-warn';
    if (['approved', 'active', 'success', 'delivered', 'converted'].includes(val)) return 'bg-success';
    if (['rejected', 'inactive', 'failed', 'cancelled', 'deleted'].includes(val)) return 'bg-error';
    return 'bg-info';
  }

  getBadgeIcon(value: any): string {
    const cls = this.getBadgeClass(value);
    switch (cls) {
      case 'bg-success': return 'check_circle';
      case 'bg-warn': return 'warning';
      case 'bg-error': return 'cancel';
      default: return 'info';
    }
  }

  getBadgeText(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'Active' : 'Inactive';
    }
    return value ? value.toString() : 'Unknown';
  }

  exportToExcel() {
    if (!this.dataSource.data || this.dataSource.data.length === 0) {
      this.alert.error('No data to export.');
      return;
    }
    
    const exportData = this.dataSource.data.map(row => {
      const formattedRow: any = {};
      this.columns.forEach(col => {
        formattedRow[col.header] = row[col.columnDef];
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    const filename = this.title ? `${this.title.replace(/\s+/g, '_')}_export.xlsx` : 'table_export.xlsx';
    XLSX.writeFile(workbook, filename);
  }

  exportToPDF() {
    if (!this.dataSource.data || this.dataSource.data.length === 0) {
      this.alert.error('No data to export.');
      return;
    }

    const doc = new jsPDF();
    const headers = this.columns.map(col => col.header);
    const data = this.dataSource.data.map(row => this.columns.map(col => row[col.columnDef]));

    if (this.title) {
      doc.setFontSize(14);
      doc.text(this.title, 14, 15);
    }

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: this.title ? 20 : 10,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241] }, // Indigo accent
    });

    const filename = this.title ? `${this.title.replace(/\s+/g, '_')}_export.pdf` : 'table_export.pdf';
    doc.save(filename);
  }
}