import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { AlertService } from 'src/app/Securities/Services/alert.service';
import { AuthService } from 'src/app/Securities/Services/auth.service';
import { CommonService } from 'src/app/Securities/Services/common.service';
import { SessionService } from 'src/app/Securities/Services/session.service';
import { environment } from 'src/environment/environment';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    TablerIconsModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {

  ProfileForm: FormGroup;
  ProfileId: any;
  ProfileData: any;

  /** Local preview URL for avatar */
  avatarPreview: string | null = null;
  avatarFile: File | null = null;

  /** Local preview URL for cover */
  coverPreview: string | null = null;
  coverFile: File | null = null;

  isSaving = false;

  /** Stats shown under the avatar */
  stats = [
    { label: 'Orders',   value: '128',  icon: 'shopping-cart' },
    { label: 'Revenue',  value: '₹4.2L', icon: 'currency-rupee' },
    { label: 'Days Active', value: '365', icon: 'calendar-check' },
  ];

  constructor(
    private authService: AuthService,
    private alert: AlertService,
    private commonService: CommonService,
    private sessionService: SessionService,
    private fb: FormBuilder
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

  /** Format backend image paths cleanly */
  formatImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:image')) {
      return path;
    }
    const baseUrl = environment.socketUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /** Fallback handler if image fails to load */
  onImageError(type: string): void {
    if (type === 'avatar') {
      this.avatarPreview = null;
    } else if (type === 'cover') {
      this.coverPreview = null;
    }
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

        // Set Avatar Image
        const imgPath = this.ProfileData?.image || this.ProfileData?.profile_image || this.ProfileData?.profileImage || this.ProfileData?.avatar;
        if (imgPath && !this.avatarFile) {
          this.avatarPreview = this.formatImageUrl(imgPath);
        }

        // Set Background Cover Image
        const coverPath = this.ProfileData?.background_image || this.ProfileData?.backgroundImage || this.ProfileData?.cover_image || this.ProfileData?.profile_cover;
        if (coverPath && !this.coverFile) {
          this.coverPreview = this.formatImageUrl(coverPath);
        }

        // Keep session user data in sync so top header also gets updated
        const currentUser = this.authService.getUser();
        if (currentUser && this.ProfileData) {
          this.sessionService.setSession({
            user: { ...currentUser, ...this.ProfileData }
          });
        }
      }
    });
  }

  /** Avatar file chosen */
  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.avatarPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  /** Cover file chosen */
  onCoverChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.coverFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.coverPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  /** Get initials from name */
  get initials(): string {
    const name = this.ProfileForm.get('name')?.value || this.ProfileData?.name || 'A';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  onSubmit(): void {
    if (this.ProfileForm.invalid) {
      this.ProfileForm.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    const payload = this.ProfileForm.getRawValue();
    
    const formData = new FormData();
    if (payload.name) formData.append('name', payload.name);
    if (payload.email) formData.append('email', payload.email);
    if (payload.mobilenumber) formData.append('mobilenumber', payload.mobilenumber);
    if (payload.address) formData.append('address', payload.address);
    if (payload.userType) formData.append('userType', payload.userType);
    
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
        
        // Update session immediately if backend returned data
        if (res?.data || res?.user) {
          const currentUser = this.authService.getUser();
          this.sessionService.setSession({
            user: { ...currentUser, ...(res.data || res.user) }
          });
        }

        // Refresh profile data to pick up the new image and details
        this.getProfile();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.alert.error(err?.error?.message || 'Profile update failed');
      }
    });
  }

  onReset(): void {
    this.avatarFile = null;
    this.coverFile = null;
    this.getProfile();
  }
}
