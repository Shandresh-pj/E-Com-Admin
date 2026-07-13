import { Component, ViewChild } from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { MatButtonModule } from '@angular/material/button';

import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  ApexPlotOptions,
  ApexFill,
  ApexMarkers,
  ApexResponsive,
  NgApexchartsModule,
} from 'ng-apexcharts';


interface month {
  value: string;
  viewValue: string;
}

export interface profitExpanceChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  grid: ApexGrid;
  marker: ApexMarkers;
}

@Component({
  selector: 'app-profit-expenses',
  imports: [MaterialModule, TablerIconsModule, MatButtonModule, NgApexchartsModule],
  templateUrl: './profit-expenses.component.html',
})
export class AppProfitExpensesComponent {

  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  public profitExpanceChart!: Partial<profitExpanceChart> | any;

  months: month[] = [
    { value: 'mar', viewValue: 'Sep 2025' },
    { value: 'apr', viewValue: 'Oct 2025' },
    { value: 'june', viewValue: 'Nov 2025' },
  ];


  constructor() {

    // generate dynamic random data on load
    const generateSeries = (min: number, max: number, count: number) => {
      return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    };

    const earnings = generateSeries(50, 150, 7);
    const expenses = generateSeries(20, 80, 7);

    // sales overview chart
    this.profitExpanceChart = {
      series: [
        {
          name: 'Earnings this week (k)',
          data: earnings,
          color: '#4f46e5',
        },
        {
          name: 'Expense this week (k)',
          data: expenses,
          color: '#0ea5e9',
        },
      ],
      grid: {
        borderColor: 'rgba(0,0,0,0.05)',
        strokeDashArray: 3,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      plotOptions: {},
      chart: {
        type: 'area',
        height: '100%',
        offsetY: 10,
        foreColor: '#8c98a4',
        fontFamily: 'inherit',
        toolbar: { show: false },
        dropShadow: {
          enabled: true,
          color: '#6366f1',
          top: 12,
          left: 0,
          blur: 10,
          opacity: 0.1
        }
      },
      dataLabels: { enabled: false },
      markers: { size: 0, hover: { size: 6 } },
      legend: { show: false },
      xaxis: {
        type: 'category',
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        axisTicks: { show: false },
        axisBorder: { show: false },
        labels: {
          style: { cssClass: 'grey--text lighten-2--text fill-color', fontSize: '12px' },
        },
      },
      yaxis: {
        labels: {
          style: { fontSize: '12px' }
        }
      },
      stroke: {
        curve: 'smooth',
        show: true,
        width: 3,
        colors: ['#4f46e5', '#0ea5e9'],
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      colors: ['#4f46e5', '#0ea5e9'],
      tooltip: { theme: 'light', style: { fontSize: '13px' } },

      responsive: [
        {
          breakpoint: 600,
          options: {
            chart: {
              height: 300
            }
          },
        },
      ],
    };
  }
}
