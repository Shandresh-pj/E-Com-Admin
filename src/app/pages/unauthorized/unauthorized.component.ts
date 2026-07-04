import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="unauthorized-container">

      <div class="floating-circle circle1"></div>
      <div class="floating-circle circle2"></div>
      <div class="floating-circle circle3"></div>

      <div class="card-container">

        <div class="icon-wrapper">
          <mat-icon class="lock-icon">lock</mat-icon>
        </div>

        <h1 class="error-code">403</h1>

        <h2 class="title">
          Access Denied
        </h2>

        <p class="description">
          You do not have permission to access this page.
          Please contact your administrator or return to dashboard.
        </p>

        <button
          mat-flat-button
          color="primary"
          (click)="goToDashboard()"
        >
          Go To Dashboard
        </button>

      </div>

    </div>
  `,
  styles: [`
  
  .unauthorized-container{
      position:relative;
      min-height:100vh;
      display:flex;
      justify-content:center;
      align-items:center;
      overflow:hidden;

      background:linear-gradient(
          135deg,
          #0f172a,
          #1e293b,
          #334155
      );
      padding:20px;
  }

  .card-container{
      position:relative;
      z-index:10;

      width:100%;
      max-width:500px;

      padding:40px;
      border-radius:24px;

      background:rgba(255,255,255,0.1);
      backdrop-filter:blur(18px);

      box-shadow:
      0 8px 30px rgba(0,0,0,0.4);

      text-align:center;

      animation:fadeIn 1s ease;
  }

  .icon-wrapper{
      width:100px;
      height:100px;

      margin:auto;

      display:flex;
      justify-content:center;
      align-items:center;

      border-radius:50%;

      background:rgba(255,255,255,.15);

      animation:pulse 2s infinite;
  }

  .lock-icon{
      font-size:50px;
      width:50px;
      height:50px;
      color:#ff5252;
  }

  .error-code{
      margin-top:25px;
      font-size:80px;
      font-weight:800;
      color:#fff;
      margin-bottom:10px;

      animation:slideDown 1s;
  }

  .title{
      color:#ff5252;
      margin-bottom:15px;
      font-size:32px;
      font-weight:600;
  }

  .description{
      color:#ddd;
      margin-bottom:30px;
      line-height:1.6;
      font-size:16px;
  }

  button{
      width:100%;
      height:50px;
      border-radius:30px;
      font-size:16px;
  }

  .floating-circle{
      position:absolute;
      border-radius:50%;
      background:rgba(255,255,255,.08);
      animation:float 8s infinite ease-in-out;
  }

  .circle1{
      width:250px;
      height:250px;
      top:-60px;
      left:-60px;
  }

  .circle2{
      width:150px;
      height:150px;
      right:10%;
      bottom:15%;
      animation-delay:2s;
  }

  .circle3{
      width:100px;
      height:100px;
      bottom:5%;
      left:20%;
      animation-delay:4s;
  }

  @keyframes pulse{
      0%{
          transform:scale(1);
      }

      50%{
          transform:scale(1.1);
      }

      100%{
          transform:scale(1);
      }
  }

  @keyframes float{
      0%{
          transform:translateY(0);
      }

      50%{
          transform:translateY(-25px);
      }

      100%{
          transform:translateY(0);
      }
  }

  @keyframes slideDown{
      from{
          transform:translateY(-40px);
          opacity:0;
      }

      to{
          transform:translateY(0);
          opacity:1;
      }
  }

  @keyframes fadeIn{
      from{
          opacity:0;
          transform:scale(.9);
      }

      to{
          opacity:1;
          transform:scale(1);
      }
  }

  /* Mobile responsiveness */

  @media(max-width:768px){

      .card-container{
          padding:30px 20px;
      }

      .error-code{
          font-size:60px;
      }

      .title{
          font-size:26px;
      }

      .description{
          font-size:14px;
      }

      .icon-wrapper{
          width:80px;
          height:80px;
      }

      .lock-icon{
          font-size:40px;
      }
  }

  `]
})
export class UnauthorizedComponent {

  constructor(private router: Router) { }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

}