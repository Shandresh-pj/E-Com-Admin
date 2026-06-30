import { Component } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {

  ProfileForm : FormGroup;
  ProfileId: any;
  ProfileData: any;


  constructor(
    private authService:AuthService,
    private alert: AlertService,
    private commonService:CommonService,
    private fb:FormBuilder
  ){
    this.ProfileForm = fb.group({
      name : ['', Validators.required],
      email : [{value:'',disabled:true}, Validators.required],
      mobilenumber : [{value:'',disabled:true}, Validators.required],
      address : ['',Validators.required],
      userType:[{value:'',disabled:true},Validators.required]
    })
  const user = this.authService.getUser();
  console.log("aaaa-1.3",user)
   this.ProfileId  = user?.id
   this.getProfile();
  }


  ngOnInit(){
    
  }

  getProfile(){
    this.commonService.getApi(`profile/${this.ProfileId}`).subscribe({
      next:(res:any) => {
        this.ProfileData = res?.data;

        this.ProfileForm.patchValue({
          name: this.ProfileData?.name,
          email: this.ProfileData?.email,
          mobilenumber: this.ProfileData.mobilenumber,
          address: this.ProfileData?.address,
          userType: this.ProfileData?.userType,
         })
      }
    })
  }

  onSubmit(Form: FormGroup) {
    if (Form.invalid) {
      Form.markAllAsTouched();
      return;
    }
    const payload = Form.getRawValue();
    this.commonService.putApi(`profile/${this.ProfileId}`, payload).subscribe({
      next: () => {
        this.alert.success('Profile updated successfully');
      },
      error: (err: any) => {
        this.alert.error(err?.error?.message || 'Profile update failed');
      }
    });
  }
}
