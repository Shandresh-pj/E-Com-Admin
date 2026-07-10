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

export interface trafficdistributionChart {
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
  selector: 'app-traffic-distribution',
  imports: [MaterialModule, TablerIconsModule, MatButtonModule, NgApexchartsModule],
  templateUrl: './traffic-distribution.component.html',
})
export class AppTrafficDistributionComponent {

  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  public trafficdistributionChart!: Partial<trafficdistributionChart> | any;


  constructor() {

    const organic = Math.floor(Math.random() * 30) + 30; // 30-60
    const referral = Math.floor(Math.random() * 20) + 20; // 20-40
    const social = 100 - organic - referral; // Remaining percentage

    const totalTraffic = Math.floor(Math.random() * 5000) + 3000;

    this.trafficdistributionChart = {
      series: [organic, referral, social],
      labels: ['Organic', 'Referral', 'Social'],
      chart: {
        type: 'radialBar',
        fontFamily: "inherit",
        foreColor: '#adb0bb',
        toolbar: { show: false },
        height: 180,
      },
      colors: ['#4f46e5', '#ec4899', '#10b981'],
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            margin: 5,
            size: '45%',
            background: 'transparent',
            image: undefined,
          },
          track: {
            background: 'rgba(0,0,0,0.05)',
            margin: 8,
          },
          dataLabels: {
            name: {
              fontSize: '12px',
              color: '#adb0bb',
              offsetY: -5,
            },
            value: {
              fontSize: '18px',
              color: '#333',
              fontWeight: 700,
              offsetY: 5,
            },
            total: {
              show: true,
              label: 'Total',
              color: '#adb0bb',
              formatter: function (w: any) {
                return totalTraffic;
              }
            }
          }
        }
      },
      stroke: { lineCap: 'round' },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { enabled: true, theme: 'light' },
    };

  }
}
