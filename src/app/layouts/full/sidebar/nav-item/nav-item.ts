export interface NavItem {
    displayName?: string;
    iconName?: string;
    navCap?: string;
    route?: string;
    queryParams?: { [key: string]: any };
    children?: NavItem[];
    chip?: boolean;
    chipContent?: string;
    chipClass?: string;
    external?: boolean;
    bgcolor?: string;
    roles?: string[];
}  