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

export interface productsalesChart {
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
  selector: 'app-product-sales',
  imports: [MaterialModule, TablerIconsModule, MatButtonModule, NgApexchartsModule],
  templateUrl: './product-sales.component.html',
})
export class AppProductSalesComponent {

  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  public productsalesChart!: Partial<productsalesChart> | any;


  constructor() {

    const generateSeries = (min: number, max: number, count: number) => {
      return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    };

    const salesData = generateSeries(10, 80, 7);

    this.productsalesChart = {
      series: [
        {
          name: 'Sales',
          color: '#8b5cf6',
          data: salesData,
        },
      ],

      colors: ['#8b5cf6'],
      chart: {
        type: 'area',
        fontFamily: "inherit",
        foreColor: '#adb0bb',
        toolbar: { show: false },
        height: 80,
        sparkline: { enabled: true },
        group: 'sparklines',
        dropShadow: {
          enabled: true,
          color: '#8b5cf6',
          top: 6,
          left: 0,
          blur: 6,
          opacity: 0.3
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 1,
          gradientToColors: ['#3b82f6'],
          inverseColors: false,
          opacityFrom: 0.5,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      markers: { size: 0 },
      tooltip: {
        theme: 'dark',
        x: { show: false },
      },
    };

  }
}
