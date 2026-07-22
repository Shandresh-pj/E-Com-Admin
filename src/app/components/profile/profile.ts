import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { SessionService } from 'src/app/Securities/Services/session.service';
import { PermissionService } from 'src/app/Securities/Services/permissions.service';
import { environment } from 'src/environment/environment';
import { AppTranslatePipe } from 'src/app/pipes/app-translate.pipe';

export type ProfileSection = 'account' | 'security' | 'activity';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    TablerIconsModule,
    AppTranslatePipe
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {

  ProfileForm: FormGroup;
  ProfileId: any;
  ProfileData: any;

  avatarPreview: string | null = null;
  avatarFile: File | null = null;

  coverPreview: string | null = null;
  coverFile: File | null = null;

  isSaving = false;
  activeSection: ProfileSection = 'account';

  stats = [
    { label: 'Days Active',  value: '365+', icon: 'calendar-check'  },
    { label: 'Leave Taken',  value: '12',   icon: 'calendar-off'    },
    { label: 'Attendance',   value: '98%',  icon: 'chart-bar'       },
  ];

  recentActivity = [
    { icon: 'login',         title: 'Logged In',           time: 'Just now',    desc: 'Successful login from web browser.', color: 'success' },
    { icon: 'file-check',    title: 'KYC Submitted',       time: '2 days ago',  desc: 'Aadhaar card submitted for HR verification.', color: 'info' },
    { icon: 'lock',          title: 'Password Changed',    time: '1 week ago',  desc: 'Account password was updated successfully.', color: 'warning' },
    { icon: 'user-edit',     title: 'Profile Updated',     time: '2 weeks ago', desc: 'Address and profile photo were updated.', color: 'success' },
    { icon: 'calendar-event','title': 'Leave Approved',    time: '1 month ago', desc: 'Annual leave request was approved by HR.', color: 'success' },
  ];

  constructor(
    public authService: AuthService,
    private alert: AlertService,
    private commonService: CommonService,
    private sessionService: SessionService,
    public perm: PermissionService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.ProfileForm = this.fb.group({
      name:         ['', Validators.required],
      email:        [{ value: '', disabled: true }, Validators.required],
      mobilenumber: [{ value: '', disabled: true }, Validators.required],
      address:      ['', Validators.required],
      userType:     [{ value: '', disabled: true }, Validators.required],
    });

    const user = this.authService.getUser();
    this.ProfileId = user?.id;
  }

  ngOnInit(): void {
    this.getProfile();
  }

  formatImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:image')) {
      return path;
    }
    const baseUrl = environment.socketUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  onImageError(type: string): void {
    if (type === 'avatar') this.avatarPreview = null;
    if (type === 'cover')  this.coverPreview = null;
  }

  getProfile(): void {
    this.commonService.getApi(`profile/${this.ProfileId}`).subscribe({
      next: (res: any) => {
        this.ProfileData = res?.data;
        this.ProfileForm.patchValue({
          name:         this.ProfileData?.name,
          email:        this.ProfileData?.email,
          mobilenumber: this.ProfileData?.mobilenumber,
          address:      this.ProfileData?.address,
          userType:     this.ProfileData?.userType,
        });

        const imgPath = this.ProfileData?.image || this.ProfileData?.profile_image
          || this.ProfileData?.profileImage || this.ProfileData?.avatar;
        if (imgPath && !this.avatarFile) {
          this.avatarPreview = this.formatImageUrl(imgPath);
        }

        const coverPath = this.ProfileData?.background_image || this.ProfileData?.backgroundImage
          || this.ProfileData?.cover_image || this.ProfileData?.profile_cover;
        if (coverPath && !this.coverFile) {
          this.coverPreview = this.formatImageUrl(coverPath);
        }

        const currentUser = this.authService.getUser();
        if (currentUser && this.ProfileData) {
          this.sessionService.setSession({
            user: { ...currentUser, ...this.ProfileData }
          });
        }
        this.cdr.markForCheck();
      }
    });
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.avatarPreview = reader.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  onCoverChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.coverFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.coverPreview = reader.result as string; this.cdr.markForCheck(); };
    reader.readAsDataURL(file);
  }

  get initials(): string {
    const name = this.ProfileForm.get('name')?.value || this.ProfileData?.name || 'A';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  onSubmit(): void {
    if (this.ProfileForm.invalid) {
      this.ProfileForm.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    const payload = this.ProfileForm.getRawValue();

    const formData = new FormData();
    if (payload.name)         formData.append('name', payload.name);
    if (payload.email)        formData.append('email', payload.email);
    if (payload.mobilenumber) formData.append('mobilenumber', payload.mobilenumber);
    if (payload.address)      formData.append('address', payload.address);
    if (payload.userType)     formData.append('userType', payload.userType);
    if (this.avatarFile) {
      formData.append('image', this.avatarFile);
      formData.append('profile_image', this.avatarFile);
    }
    if (this.coverFile) {
      formData.append('background_image', this.coverFile);
      formData.append('cover_image', this.coverFile);
    }

    this.commonService.putFormData(`profile/${this.ProfileId}`, formData).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.alert.success('Profile updated successfully! 🎉');
        this.avatarFile = null;
        this.coverFile = null;
        if (res?.data || res?.user) {
          const currentUser = this.authService.getUser();
          this.sessionService.setSession({
            user: { ...currentUser, ...(res.data || res.user) }
          });
        }
        this.getProfile();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.alert.error(err?.error?.message || 'Profile update failed');
        this.cdr.markForCheck();
      }
    });
  }

  onReset(): void {
    this.avatarFile = null;
    this.coverFile = null;
    this.getProfile();
  }
}
