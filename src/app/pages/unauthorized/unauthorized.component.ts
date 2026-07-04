import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';

@Component({
    selector: 'app-unauthorized',
    standalone: true,
    imports: [MaterialModule],

    template: `

<div class="page">

  <!-- Animated background -->

  <div class="bg-gradient"></div>

  <div class="blob blob1"></div>
  <div class="blob blob2"></div>
  <div class="blob blob3"></div>

  <div class="content">

      <!-- Left section -->

      <div class="left-section">

          <div class="badge">
              <mat-icon>security</mat-icon>
              Authorization Required
          </div>

          <h1 class="error-code">
              403
          </h1>

          <h2>
              Access Restricted
          </h2>

          <p>

            The page or resource you are trying to access
            is restricted based on your permissions.
            Contact your administrator if you believe
            this is a mistake.

          </p>

          <div class="buttons">

              <button
                  mat-flat-button
                  color="primary"
                  (click)="goToDashboard()"
              >
                  Dashboard
              </button>

              <button
                  mat-stroked-button
                  (click)="goBack()"
              >
                  Go Back
              </button>

          </div>

      </div>


      <!-- Right section -->

      <div class="right-section">

          <div class="lock-container">

              <div class="ring"></div>

              <mat-icon class="lock-icon">
                  lock
              </mat-icon>

          </div>

      </div>

  </div>

</div>

`,

    styles: [`

:host{
display:block;
height:100%;
}


.page{

position:relative;
overflow:hidden;

min-height:100vh;

display:flex;
justify-content:center;
align-items:center;

padding:30px;

background:#020617;
}


/* Background */

.bg-gradient{

position:absolute;
inset:0;

background:

radial-gradient(
circle at top left,
rgba(99,102,241,.4),
transparent 35%
),

radial-gradient(
circle at bottom right,
rgba(236,72,153,.3),
transparent 40%
);

}


.blob{

position:absolute;
border-radius:50%;
filter:blur(80px);

animation:move 18s infinite alternate;

}

.blob1{

width:300px;
height:300px;

background:#6366f1;

top:-100px;
left:-100px;
}

.blob2{

width:250px;
height:250px;

background:#ec4899;

right:-80px;
bottom:20%;
}

.blob3{

width:200px;
height:200px;

background:#06b6d4;

bottom:-60px;
left:35%;
}


/* Main content */

.content{

position:relative;
z-index:10;

display:grid;
grid-template-columns:1fr 1fr;

width:100%;
max-width:1200px;

padding:50px;

border-radius:30px;

background:
rgba(255,255,255,.08);

backdrop-filter:blur(25px);

border:1px solid rgba(255,255,255,.15);

box-shadow:

0 30px 80px rgba(0,0,0,.4);

}


.left-section{

display:flex;
flex-direction:column;
justify-content:center;

padding-right:50px;
}


.badge{

display:inline-flex;
align-items:center;
gap:8px;

padding:10px 18px;

border-radius:40px;

width:fit-content;

background:rgba(255,255,255,.1);

color:#fff;

margin-bottom:25px;

font-size:13px;
}


.error-code{

font-size:120px;
font-weight:800;

margin:0;

line-height:1;

background:linear-gradient(
90deg,
#6366f1,
#ec4899
);

-webkit-background-clip:text;

-webkit-text-fill-color:transparent;
}


h2{

font-size:42px;

color:white;

margin-top:10px;
margin-bottom:15px;
}


p{

font-size:16px;
line-height:1.8;

color:#cbd5e1;

max-width:500px;
}


.buttons{

margin-top:30px;

display:flex;
gap:15px;
flex-wrap:wrap;
}


button{

height:50px;
padding:0 30px;

border-radius:40px;
}


/* Right side */

.right-section{

display:flex;
justify-content:center;
align-items:center;
}


.lock-container{

position:relative;

width:260px;
height:260px;

display:flex;
justify-content:center;
align-items:center;
}


.ring{

position:absolute;

width:100%;
height:100%;

border-radius:50%;

border:2px solid
rgba(255,255,255,.15);

animation:rotate 12s linear infinite;
}


.lock-icon{

font-size:110px;
width:110px;
height:110px;

color:white;

animation:pulse 2s infinite;
}



/* Animations */

@keyframes rotate{

from{
transform:rotate(0deg);
}

to{
transform:rotate(360deg);
}

}


@keyframes pulse{

50%{
transform:scale(1.1);
}

}


@keyframes move{

100%{

transform:
translateY(60px)
translateX(80px);

}

}


/* Responsive */

@media(max-width:992px){

.content{

grid-template-columns:1fr;

text-align:center;

padding:30px;
}

.left-section{

padding-right:0;
align-items:center;
}

.right-section{

margin-top:40px;
}

.error-code{

font-size:90px;
}

}


@media(max-width:576px){

.error-code{

font-size:70px;
}

h2{

font-size:28px;
}

p{

font-size:14px;
}

.lock-container{

width:180px;
height:180px;
}

.lock-icon{

font-size:80px;
}

.buttons{

justify-content:center;
}

}

`]

})

export class UnauthorizedComponent {

    constructor(
        private router: Router
    ) { }

    goToDashboard() {

        this.router.navigate(
            ['/dashboard']
        );

    }

    goBack() {

        window.history.back();

    }

}