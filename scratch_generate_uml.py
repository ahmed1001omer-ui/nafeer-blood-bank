import os
from PIL import Image, ImageDraw, ImageFont

def get_font(size, is_bold=False):
    # Try system fonts for clean crisp rendering
    font_names = [
        "arialbd.ttf" if is_bold else "arial.ttf",
        "calibrib.ttf" if is_bold else "calibri.ttf",
        "DejaVuSans-Bold.ttf" if is_bold else "DejaVuSans.ttf",
        "LiberationSans-Bold.ttf" if is_bold else "LiberationSans.ttf"
    ]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()

def draw_staruml_class(draw, x, y, width, title, stereotype, attributes, methods, font_title, font_body):
    title_height = 42 if stereotype else 32
    padding_y = 6
    line_spacing = 18
    
    attr_height = padding_y * 2 + len(attributes) * line_spacing if attributes else 0
    meth_height = padding_y * 2 + len(methods) * line_spacing if methods else 0
    
    total_height = title_height + attr_height + meth_height
    
    # Outer box (White fill, 2px black border)
    draw.rectangle([x, y, x + width, y + total_height], fill="#FFFFFF", outline="#000000", width=2)
    
    # Title Compartment
    curr_y = y
    if stereotype:
        draw.text((x + width / 2, curr_y + 6), f"<<{stereotype}>>", fill="#333333", font=font_body, anchor="mt")
        draw.text((x + width / 2, curr_y + 22), title, fill="#000000", font=font_title, anchor="mt")
    else:
        draw.text((x + width / 2, curr_y + 8), title, fill="#000000", font=font_title, anchor="mt")
        
    curr_y += title_height
    
    # Divider 1
    if attributes or methods:
        draw.line([x, curr_y, x + width, curr_y], fill="#000000", width=1)
        
    # Attributes Compartment
    if attributes:
        ay = curr_y + padding_y
        for attr in attributes:
            draw.text((x + 10, ay), attr, fill="#000000", font=font_body)
            ay += line_spacing
        curr_y += attr_height
        
    # Divider 2
    if methods:
        if attributes:
            draw.line([x, curr_y, x + width, curr_y], fill="#000000", width=1)
        my = curr_y + padding_y
        for meth in methods:
            draw.text((x + 10, my), meth, fill="#000000", font=font_body)
            my += line_spacing
            
    return {"x": x, "y": y, "w": width, "h": total_height, "cx": x + width / 2, "cy": y + total_height / 2}

def draw_arrow(draw, start, end, style="solid", arrow_type="association", label=""):
    x1, y1 = start
    x2, y2 = end
    
    if style == "dotted":
        # Draw dotted line
        dist = ((x2 - x1)**2 + (y2 - y1)**2)**0.5
        if dist > 0:
            dx = (x2 - x1) / dist
            dy = (y2 - y1) / dist
            dash_len = 6
            gap_len = 4
            curr = 0
            while curr < dist:
                ex = min(curr + dash_len, dist)
                draw.line([x1 + dx * curr, y1 + dy * curr, x1 + dx * ex, y1 + dy * ex], fill="#000000", width=2)
                curr += dash_len + gap_len
    else:
        draw.line([x1, y1, x2, y2], fill="#000000", width=2)
        
    # Draw Arrowhead
    import math
    angle = math.atan2(y2 - y1, x2 - x1)
    arrow_size = 10
    
    if arrow_type == "association":
        px1 = x2 - arrow_size * math.cos(angle - math.pi / 6)
        py1 = y2 - arrow_size * math.sin(angle - math.pi / 6)
        px2 = x2 - arrow_size * math.cos(angle + math.pi / 6)
        py2 = y2 - arrow_size * math.sin(angle + math.pi / 6)
        draw.line([x2, y2, px1, py1], fill="#000000", width=2)
        draw.line([x2, y2, px2, py2], fill="#000000", width=2)
    elif arrow_type == "generalization":
        px1 = x2 - (arrow_size + 4) * math.cos(angle - math.pi / 6)
        py1 = y2 - (arrow_size + 4) * math.sin(angle - math.pi / 6)
        px2 = x2 - (arrow_size + 4) * math.cos(angle + math.pi / 6)
        py2 = y2 - (arrow_size + 4) * math.sin(angle + math.pi / 6)
        draw.polygon([(x2, y2), (px1, py1), (px2, py2)], fill="#FFFFFF", outline="#000000")
        
    if label:
        lx = (x1 + x2) / 2
        ly = (y1 + y2) / 2 - 12
        font = get_font(12)
        draw.text((lx, ly), label, fill="#333333", font=font, anchor="mm")

def draw_header_title(draw, width, title, subtitle):
    font_t = get_font(22, is_bold=True)
    font_s = get_font(13)
    draw.text((width / 2, 25), title, fill="#000000", font=font_t, anchor="mt")
    draw.text((width / 2, 55), subtitle, fill="#555555", font=font_s, anchor="mt")
    draw.line([60, 80, width - 60, 80], fill="#CCCCCC", width=1)

# ==============================================================================
# Diagram 1: Nafeer Android App Class Diagram
# ==============================================================================
def render_android_diagram(output_path):
    W, H = 2200, 1500
    img = Image.new("RGB", (W, H), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, is_bold=True)
    font_body = get_font(12)
    
    draw_header_title(draw, W, "Nafeer Blood Bank — Android Mobile App Class Diagram", "UML Class Diagram strictly representing real mobile codebase entities and services")
    
    boxes = {}
    
    # Column 1: Context & Core Controllers
    boxes["AppContext"] = draw_staruml_class(
        draw, 60, 120, 380, "AppContext", "Context / State",
        ["+ hydrated : boolean", "+ user : User | null", "+ isDark : boolean", "+ interestIds : string[]", "+ releaseConfig : MobileReleaseConfig | null", "+ releaseState : AppAvailabilityStatus"],
        ["+ signIn(phone, pwd) : Promise<AuthResult>", "+ signUp(user, pwd) : Promise<void>", "+ updateProfile(user) : Promise<void>", "+ signOut() : Promise<void>", "+ setDarkMode(value) : Promise<void>", "+ toggleInterest(id) : Promise<void>"],
        font_title, font_body
    )
    
    boxes["MobileAuth"] = draw_staruml_class(
        draw, 60, 520, 380, "MobileAuth", "Auth Service",
        [],
        ["+ getToken() : Promise<string | null>", "+ setToken(token) : Promise<void>", "+ clearToken() : Promise<void>", "+ getCachedMobileUser() : Promise<User | null>", "+ cacheMobileUser(user) : Promise<void>", "+ clearCachedMobileUser() : Promise<void>", "+ signInMobile(phone, pwd) : Promise<User>", "+ signUpMobile(data) : Promise<User>", "+ getMobileMe() : Promise<User>", "+ updateMobileProfile(data) : Promise<User>"],
        font_title, font_body
    )
    
    boxes["AppReleaseManager"] = draw_staruml_class(
        draw, 60, 1000, 380, "AppReleaseManager", "Release Service",
        ["+ apiVersion : number", "+ minSupportedAppVersion : string", "+ latestAppVersion : string", "+ maintenance : boolean"],
        ["+ getCurrentAppVersion() : string", "+ getMobileReleaseConfig() : Promise<Config>", "+ checkAppAvailability() : Promise<Status>"],
        font_title, font_body
    )

    boxes["AppUpdateService"] = draw_staruml_class(
        draw, 60, 1280, 380, "AppUpdateService", "OTA & Store Update",
        [],
        ["+ checkForAppUpdate() : Promise<Result>", "+ downloadAndApplyAppUpdate() : Promise<void>", "+ openStoreUrl(url) : Promise<void>"],
        font_title, font_body
    )
    
    # Column 2: Data Models
    boxes["User"] = draw_staruml_class(
        draw, 560, 120, 360, "User", "Model / Interface",
        ["+ id : string", "+ name : string", "+ phone : string", "+ city : string", "+ bloodType : string", "+ isDonor : boolean", "+ lastDonationDate? : string"],
        [], font_title, font_body
    )
    
    boxes["BloodRequest"] = draw_staruml_class(
        draw, 560, 380, 360, "BloodRequest", "Model / Interface",
        ["+ id : string", "+ patientName : string", "+ bloodType : string", "+ units : number", "+ hospital : string", "+ city : string", "+ phone : string", "+ neededBy : string", "+ status : 'urgent' | 'normal'", "+ notes? : string"],
        [], font_title, font_body
    )
    
    boxes["BloodBankPost"] = draw_staruml_class(
        draw, 560, 720, 360, "BloodBankPost", "Model / Interface",
        ["+ id : string", "+ bloodType : string", "+ component : string", "+ unitsNeeded : number", "+ hospital : string", "+ phone : string", "+ urgency : 'critical' | 'urgent' | 'normal'", "+ isUrgent : boolean", "+ publishDate : string"],
        [], font_title, font_body
    )
    
    boxes["DonationCenter"] = draw_staruml_class(
        draw, 560, 1060, 360, "DonationCenter", "Model / Interface",
        ["+ id : string", "+ name : string", "+ address : string", "+ phone : string", "+ city : string", "+ distance? : string", "+ availability? : string"],
        [], font_title, font_body
    )

    # Column 3: API Gateway & Services
    boxes["MobileApi"] = draw_staruml_class(
        draw, 1040, 480, 420, "MobileApi", "API Gateway Service",
        ["- API_BASE_URL : string"],
        ["+ getBloodBankPosts(limit, offset) : Promise<MobilePostsResponse>", "+ getBloodBankPost(id) : Promise<BloodBankPost>", "+ getBloodRequests(limit, offset) : Promise<BloodRequest[]>", "+ getDonationCenters() : Promise<DonationCenter[]>", "+ getMyDonations() : Promise<DonationsResponse>"],
        font_title, font_body
    )
    
    boxes["MobileApiError"] = draw_staruml_class(
        draw, 1040, 120, 350, "MobileApiError", "Exception Class",
        ["+ message : string", "+ name : string"],
        ["+ constructor(message: string)"],
        font_title, font_body
    )
    
    boxes["Error"] = draw_staruml_class(
        draw, 1500, 120, 220, "Error", "Standard Class",
        ["+ message : string", "+ name : string"],
        [], font_title, font_body
    )
    
    # Orthogonal & Direct Connectors
    # AppContext -> User
    draw_arrow(draw, (boxes["AppContext"]["x"] + boxes["AppContext"]["w"], 220), (boxes["User"]["x"], 220), style="solid", arrow_type="association", label="1  manages  0..1")
    
    # AppContext ..> MobileAuth
    draw_arrow(draw, (boxes["AppContext"]["cx"], boxes["AppContext"]["y"] + boxes["AppContext"]["h"]), (boxes["MobileAuth"]["cx"], boxes["MobileAuth"]["y"]), style="dotted", arrow_type="association", label="uses")

    # AppContext ..> AppReleaseManager
    draw_arrow(draw, (boxes["MobileAuth"]["cx"], boxes["MobileAuth"]["y"] + boxes["MobileAuth"]["h"]), (boxes["AppReleaseManager"]["cx"], boxes["AppReleaseManager"]["y"]), style="dotted", arrow_type="association", label="checks availability")

    # AppUpdateService ..> AppReleaseManager
    draw_arrow(draw, (boxes["AppUpdateService"]["cx"], boxes["AppUpdateService"]["y"]), (boxes["AppReleaseManager"]["cx"], boxes["AppReleaseManager"]["y"] + boxes["AppReleaseManager"]["h"]), style="dotted", arrow_type="association", label="queries config")

    # MobileAuth ..> User
    draw_arrow(draw, (boxes["MobileAuth"]["x"] + boxes["MobileAuth"]["w"], 580), (boxes["User"]["x"] + 100, boxes["User"]["y"] + boxes["User"]["h"]), style="dotted", arrow_type="association", label="caches & authenticates")

    # MobileApi ..> BloodRequest
    draw_arrow(draw, (boxes["MobileApi"]["x"], 520), (boxes["BloodRequest"]["x"] + boxes["BloodRequest"]["w"], 520), style="dotted", arrow_type="association", label="fetches")

    # MobileApi ..> BloodBankPost
    draw_arrow(draw, (boxes["MobileApi"]["x"], 740), (boxes["BloodBankPost"]["x"] + boxes["BloodBankPost"]["w"], 740), style="dotted", arrow_type="association", label="fetches")

    # MobileApi ..> DonationCenter
    draw_arrow(draw, (boxes["MobileApi"]["x"], 900), (boxes["DonationCenter"]["x"] + boxes["DonationCenter"]["w"], 1120), style="dotted", arrow_type="association", label="fetches")

    # MobileApi ..> MobileApiError
    draw_arrow(draw, (boxes["MobileApi"]["cx"], boxes["MobileApi"]["y"]), (boxes["MobileApiError"]["cx"], boxes["MobileApiError"]["y"] + boxes["MobileApiError"]["h"]), style="dotted", arrow_type="association", label="throws")

    # MobileApiError <|-- Error
    draw_arrow(draw, (boxes["MobileApiError"]["x"] + boxes["MobileApiError"]["w"], 180), (boxes["Error"]["x"], 180), style="solid", arrow_type="generalization", label="extends")

    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Saved: {output_path}")

# ==============================================================================
# Diagram 2: Nafeer Admin Dashboard Class Diagram
# ==============================================================================
def render_admin_diagram(output_path):
    W, H = 2600, 1800
    img = Image.new("RGB", (W, H), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, is_bold=True)
    font_body = get_font(12)
    
    draw_header_title(draw, W, "Nafeer Blood Bank — Admin Management Dashboard Class Diagram", "UML Class Diagram strictly representing Drizzle ORM Schema Entities, RBAC & Core Backend Services")
    
    boxes = {}
    
    # Layer 1: Core System & Auth Models (Left Column)
    boxes["User"] = draw_staruml_class(
        draw, 60, 120, 380, "User", "Entity / DB Table: users",
        ["+ id : number (PK)", "+ username : string (Unique)", "+ fullName : string", "+ passwordHash : string", "+ role : string", "+ permissions : string[] (JSON)", "+ active : boolean", "+ email : string | null", "+ phone : string | null", "+ lastLoginAt : Date | null"],
        [], font_title, font_body
    )
    
    boxes["MobileUser"] = draw_staruml_class(
        draw, 60, 460, 380, "MobileUser", "Entity / DB Table: mobile_users",
        ["+ id : number (PK)", "+ name : string", "+ phone : string (Unique)", "+ city : string", "+ bloodType : string", "+ passwordHash : string", "+ active : boolean", "+ otpHash : string | null"],
        [], font_title, font_body
    )

    boxes["AuditLog"] = draw_staruml_class(
        draw, 60, 780, 380, "AuditLog", "Entity / DB Table: audit_logs",
        ["+ id : number (PK)", "+ userId : number | null", "+ username : string | null", "+ action : string", "+ entity : string", "+ entityId : string | null", "+ page : string | null", "+ ip : string | null"],
        [], font_title, font_body
    )

    boxes["SystemSetting"] = draw_staruml_class(
        draw, 60, 1100, 380, "SystemSetting", "Entity / DB Table: system_settings",
        ["+ id : number (PK)", "+ key : string (Unique)", "+ value : JSON", "+ updatedAt : Date"],
        [], font_title, font_body
    )

    # Layer 2: Clinical & Donor Operations (Middle Column 1)
    boxes["Donor"] = draw_staruml_class(
        draw, 520, 120, 420, "Donor", "Entity / DB Table: donors",
        ["+ id : number (PK)", "+ code : string (Unique)", "+ name : string", "+ age : number", "+ gender : string", "+ phone : string | null", "+ bloodType : string", "+ eligibility : string", "+ stage : string", "+ status : string", "+ donationCount : number"],
        [], font_title, font_body
    )

    boxes["Donation"] = draw_staruml_class(
        draw, 520, 480, 420, "Donation", "Entity / DB Table: donations",
        ["+ id : number (PK)", "+ donorId : number (FK)", "+ donorCode : string", "+ donorName : string", "+ bloodType : string", "+ quantityMl : number", "+ donationDate : string", "+ status : string"],
        [], font_title, font_body
    )

    boxes["LabTest"] = draw_staruml_class(
        draw, 520, 800, 420, "LabTest", "Entity / DB Table: lab_tests",
        ["+ id : number (PK)", "+ donorId : number (FK)", "+ donorCode : string", "+ donorName : string", "+ hiv : string", "+ hepatitisB : string", "+ hepatitisC : string", "+ syphilis : string", "+ malaria : string", "+ decision : string", "+ approved : boolean"],
        [], font_title, font_body
    )

    boxes["Patient"] = draw_staruml_class(
        draw, 520, 1240, 420, "Patient", "Entity / DB Table: patients",
        ["+ id : number (PK)", "+ name : string", "+ age : number", "+ nationalId : string | null", "+ phone : string | null", "+ bloodType : string", "+ hospital : string", "+ gender : string"],
        [], font_title, font_body
    )

    # Layer 3: Inventory & Request Management (Middle Column 2)
    boxes["BloodUnit"] = draw_staruml_class(
        draw, 1020, 120, 420, "BloodUnit", "Entity / DB Table: blood_units",
        ["+ id : number (PK)", "+ unitNumber : string (Unique)", "+ bloodType : string", "+ rh : string", "+ component : string", "+ status : string", "+ expiryDate : string", "+ storageLocation : string", "+ sourceCode : string | null"],
        [], font_title, font_body
    )

    boxes["BloodRequest"] = draw_staruml_class(
        draw, 1020, 480, 420, "BloodRequest", "Entity / DB Table: blood_requests",
        ["+ id : number (PK)", "+ requestNumber : string (Unique)", "+ patientId : number | null (FK)", "+ patientName : string", "+ requester : string", "+ bloodType : string", "+ component : string", "+ unitsRequested : number", "+ unitsFulfilled : number", "+ priority : string", "+ status : string"],
        [], font_title, font_body
    )

    boxes["DonationPost"] = draw_staruml_class(
        draw, 1020, 880, 420, "DonationPost", "Entity / DB Table: donation_posts",
        ["+ id : number (PK)", "+ bloodType : string", "+ component : string", "+ unitsNeeded : number", "+ hospital : string", "+ urgency : string", "+ status : string"],
        [], font_title, font_body
    )

    boxes["InventoryMovement"] = draw_staruml_class(
        draw, 1020, 1240, 420, "InventoryMovement", "Entity / DB Table: inventory_movements",
        ["+ id : number (PK)", "+ unitId : number | null (FK)", "+ unitNumber : string", "+ bloodType : string", "+ type : string", "+ fromLocation : string | null", "+ toLocation : string | null", "+ performedBy : string | null"],
        [], font_title, font_body
    )

    # Layer 4: Services & Controllers (Right Column)
    boxes["AuthService"] = draw_staruml_class(
        draw, 1520, 120, 440, "AuthService", "Auth & Session Service",
        ["- COOKIE_NAME : string", "- secret : Uint8Array"],
        ["+ hashPassword(password) : Promise<string>", "+ verifyPassword(password, hash) : Promise<boolean>", "+ createSession(user, remember) : Promise<void>", "+ destroySession() : Promise<void>", "+ getSession() : Promise<SessionUser | null>", "+ authenticate(username, password) : Promise<SessionUser | null>"],
        font_title, font_body
    )

    boxes["RBACManager"] = draw_staruml_class(
        draw, 1520, 460, 440, "RBACManager", "Authorization Service",
        ["+ ROLE_LABELS : Record<string, string>", "+ ROLE_PERMISSIONS : Record<string, string[]>", "+ ALL_PERMISSIONS : string[]"],
        ["+ can(userPermissions, resource, action) : boolean", "+ permissionsForUser(role, customPermissions) : string[]"],
        font_title, font_body
    )

    boxes["BloodBankSettingsManager"] = draw_staruml_class(
        draw, 1520, 760, 440, "BloodBankSettingsManager", "System Config Service",
        ["+ BLOOD_BANK_SETTINGS_KEY : string", "+ DEFAULT_BLOOD_BANK_SETTINGS : BloodBankSettings"],
        ["+ getBloodBankSettings() : Promise<BloodBankSettings>"],
        font_title, font_body
    )

    boxes["ServerGuard"] = draw_staruml_class(
        draw, 1520, 1000, 440, "ServerGuard", "API Security Guard",
        [],
        ["+ requirePermission(resource, action) : Promise<SessionUser>", "+ writeAudit(entry) : Promise<void>", "+ clientIp(request) : string", "+ errorResponse(error) : Response"],
        font_title, font_body
    )

    # Relationships
    # Donor 1 -- * Donation
    draw_arrow(draw, (boxes["Donor"]["cx"], boxes["Donor"]["y"] + boxes["Donor"]["h"]), (boxes["Donation"]["cx"], boxes["Donation"]["y"]), style="solid", arrow_type="association", label="1  makes  *")

    # Donor 1 -- * LabTest
    draw_arrow(draw, (boxes["Donation"]["cx"], boxes["Donation"]["y"] + boxes["Donation"]["h"]), (boxes["LabTest"]["cx"], boxes["LabTest"]["y"]), style="solid", arrow_type="association", label="1  screened by  *")

    # Donation 1 -- 0..1 BloodUnit
    draw_arrow(draw, (boxes["Donation"]["x"] + boxes["Donation"]["w"], 540), (boxes["BloodUnit"]["x"], 240), style="solid", arrow_type="association", label="produces  0..1")

    # Patient 1 -- * BloodRequest
    draw_arrow(draw, (boxes["Patient"]["x"] + boxes["Patient"]["w"], 1320), (boxes["BloodRequest"]["x"], 660), style="solid", arrow_type="association", label="1  receives  *")

    # BloodUnit 1 -- * InventoryMovement
    draw_arrow(draw, (boxes["BloodUnit"]["cx"], boxes["BloodUnit"]["y"] + boxes["BloodUnit"]["h"]), (boxes["BloodRequest"]["cx"], boxes["BloodRequest"]["y"]), style="solid", arrow_type="association", label="1  fulfilled in  *")
    draw_arrow(draw, (boxes["BloodRequest"]["cx"], boxes["BloodRequest"]["y"] + boxes["BloodRequest"]["h"]), (boxes["InventoryMovement"]["cx"], boxes["InventoryMovement"]["y"]), style="solid", arrow_type="association", label="logs  *")

    # AuthService ..> User
    draw_arrow(draw, (boxes["AuthService"]["x"], 240), (boxes["User"]["x"] + boxes["User"]["w"], 240), style="dotted", arrow_type="association", label="authenticates")

    # RBACManager ..> User
    draw_arrow(draw, (boxes["RBACManager"]["x"], 520), (boxes["User"]["x"] + boxes["User"]["w"], 280), style="dotted", arrow_type="association", label="verifies permissions")

    # ServerGuard ..> AuditLog
    draw_arrow(draw, (boxes["ServerGuard"]["x"], 1080), (boxes["AuditLog"]["x"] + boxes["AuditLog"]["w"], 880), style="dotted", arrow_type="association", label="writes logs")

    # BloodBankSettingsManager ..> SystemSetting
    draw_arrow(draw, (boxes["BloodBankSettingsManager"]["x"], 820), (boxes["SystemSetting"]["x"] + boxes["SystemSetting"]["w"], 1160), style="dotted", arrow_type="association", label="reads/writes settings")

    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    lab_dir = os.path.join(os.getcwd(), "lab")
    os.makedirs(lab_dir, exist_ok=True)
    render_android_diagram(os.path.join(lab_dir, "Nafeer_Android_Class_Diagram.png"))
    render_admin_diagram(os.path.join(lab_dir, "Nafeer_Admin_Dashboard_Class_Diagram.png"))
