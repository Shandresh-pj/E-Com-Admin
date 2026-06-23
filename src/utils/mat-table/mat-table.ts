import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {MatPaginator,MatPaginatorModule} from '@angular/material/paginator';

import {MatSort,MatSortModule} from '@angular/material/sort';

import {MatTableDataSource,MatTableModule} from '@angular/material/table';

import {MatButtonModule} from '@angular/material/button';

import {MatIconModule} from '@angular/material/icon';

import {MatFormFieldModule} from '@angular/material/form-field';

import {MatInputModule} from '@angular/material/input';


@Component({
selector:'app-mat-table',
standalone:true,
imports:[
CommonModule,
MatTableModule,
MatPaginatorModule,
MatSortModule,
MatButtonModule,
MatIconModule,
MatFormFieldModule,
MatInputModule
],
templateUrl:'./mat-table.html',
styleUrl:'./mat-table.scss'
})

export class MatTable implements OnInit,AfterViewInit{


@Input() columns:any[]=[];


@Input() showAction=true;

@Input() Extra_Column = true;


@Input() set tableData( value:any[]){
this.dataSource.data=value || [];
}

@Output()editClick=new EventEmitter<any>();

@Output()AddClick=new EventEmitter<any>();
@Output()ViewClick=new EventEmitter<any>();


@Output()deleteClick=new EventEmitter<any>();

displayedColumns:string[]=[];
dataSource=new MatTableDataSource<any>();


@ViewChild(MatPaginator)paginator!:MatPaginator;

@ViewChild(MatSort)sort!:MatSort;



ngOnInit(){

this.displayedColumns=this.columns.map(x=>x.columnDef);

if(this.showAction){this.displayedColumns.push('action');}
if(this.Extra_Column){this.displayedColumns.push('Companies');}

}



ngAfterViewInit(){
this.dataSource.paginator=
this.paginator;
this.dataSource.sort=
this.sort;
}


applyFilter(event:Event){

const value=(event.target as HTMLInputElement).value;

this.dataSource.filter=value.trim().toLowerCase();
}



edit(row:any){
this.editClick.emit(row);
}

Add(row:any){
  this.AddClick.emit(row);
}
View(row:any){
  this.ViewClick.emit(row);
}


delete(row:any){
this.deleteClick.emit(row);
}

}