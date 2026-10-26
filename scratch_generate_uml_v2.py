import os
import math
from PIL import Image, ImageDraw, ImageFont

def get_font(size, is_bold=False):
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
    title_height = 44 if stereotype else 34
    padding_y = 6
    line_spacing = 18
    
    attr_height = padding_y * 2 + len(attributes) * line_spacing if attributes else 0
    meth_height = padding_y * 2 + len(methods) * line_spacing if methods else 0
    
    total_height = title_height + attr_height + meth_height
    
    # Outer box (White fill, 2px solid black border)
    draw.rectangle([x, y, x + width, y + total_height], fill="#FFFFFF", outline="#000000", width=2)
    
    # Title Compartment
    curr_y = y
    if stereotype:
        draw.text((x + width / 2, curr_y + 6), f"<<{stereotype}>>", fill="#444444", font=font_body, anchor="mt")
        draw.text((x + width / 2, curr_y + 23), title, fill="#000000", font=font_title, anchor="mt")
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
            
    return {
        "x": x, "y": y, "w": width, "h": total_height,
        "left": (x, y + total_height / 2),
        "right": (x + width, y + total_height / 2),
        "top": (x + width / 2, y),
        "bottom": (x + width / 2, y + total_height)
    }

def draw_orthogonal_line(draw, points, style="solid"):
    """Draws orthogonal segments between points."""
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i+1]
        if style == "dotted":
            dist = math.hypot(x2 - x1, y2 - y1)
            if dist > 0:
                dx = (x2 - x1) / dist
                dy = (y2 - y1) / dist
                dash = 7
                gap = 5
                curr = 0
                while curr < dist:
                    ex = min(curr + dash, dist)
                    draw.line([x1 + dx * curr, y1 + dy * curr, x1 + dx * ex, y1 + dy * ex], fill="#000000", width=2)
                    curr += dash + gap
        else:
            draw.line([x1, y1, x2, y2], fill="#000000", width=2)

def draw_arrowhead(draw, target_pt, incoming_angle, arrow_type="association"):
    """
    Draws precise arrowhead attached at target_pt.
    incoming_angle is the angle (in radians) of the segment leading INTO target_pt.
    """
    x, y = target_pt
    size = 12
    
    if arrow_type == "association":
        # Sharp V-arrow
        p1 = (x - size * math.cos(incoming_angle - math.pi / 6), y - size * math.sin(incoming_angle - math.pi / 6))
        p2 = (x - size * math.cos(incoming_angle + math.pi / 6), y - size * math.sin(incoming_angle + math.pi / 6))
        draw.line([x, y, p1[0], p1[1]], fill="#000000", width=2)
        draw.line([x, y, p2[0], p2[1]], fill="#000000", width=2)
    elif arrow_type == "generalization":
        # Hollow triangle for inheritance
        tri_len = 16
        p1 = (x - tri_len * math.cos(incoming_angle - math.pi / 6), y - tri_len * math.sin(incoming_angle - math.pi / 6))
        p2 = (x - tri_len * math.cos(incoming_angle + math.pi / 6), y - tri_len * math.sin(incoming_angle + math.pi / 6))
        draw.polygon([(x, y), p1, p2], fill="#FFFFFF", outline="#000000")

def draw_uml_connection(draw, path_points, style="solid", arrow_type="association", label="", font=None):
    """
    Draws orthogonal line path, arrowhead at the end point touching target box, and centered text label with white background.
    """
    draw_orthogonal_line(draw, path_points, style=style)
    
    # Target point & incoming angle
    last_pt = path_points[-1]
    prev_pt = path_points[-2]
    incoming_angle = math.atan2(last_pt[1] - prev_pt[1], last_pt[0] - prev_pt[0])
    
    draw_arrowhead(draw, last_pt, incoming_angle, arrow_type=arrow_type)
    
    if label:
        if font is None:
            font = get_font(12, is_bold=True)
            
        # Find midpoint segment for label placement
        mid_idx = len(path_points) // 2 - 1
        p1 = path_points[mid_idx]
        p2 = path_points[mid_idx + 1]
        lx = (p1[0] + p2[0]) / 2
        ly = (p1[1] + p2[1]) / 2
        
        # Measure text box
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        # Draw background pill to keep label clear
        draw.rectangle([lx - tw/2 - 6, ly - th/2 - 4, lx + tw/2 + 6, ly + th/2 + 4], fill="#FFFFFF", outline="#000000", width=1)
        draw.text((lx, ly), label, fill="#000000", font=font, anchor="mm")

def draw_header_title(draw, width, title, subtitle):
    font_t = get_font(24, is_bold=True)
    font_s = get_font(14)
    draw.text((width / 2, 25), title, fill="#000000", font=font_t, anchor="mt")
    draw.text((width / 2, 58), subtitle, fill="#444444", font=font_s, anchor="mt")
    draw.line([60, 85, width - 60, 85], fill="#000000", width=2)

# ==============================================================================
# Diagram 1: Nafeer Android Mobile App Class Diagram
# ==============================================================================
def render_android_diagram(output_path):
    W, H = 2400, 1650
    img = Image.new("RGB", (W, H), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, is_bold=True)
    font_body = get_font(12)
    font_label = get_font(12, is_bold=True)
    
    draw_header_title(draw, W, "Nafeer Blood Bank — Android Mobile App Class Diagram", "UML Class Diagram (Strictly Code-Aligned with Precise Connected Arrow Routing)")
    
    boxes = {}
    
    # Column 1: State & App Core (X = 80)
    boxes["AppContext"] = draw_staruml_class(
        draw, 80, 130, 440, "AppContext", "Context / State",
        ["+ hydrated : boolean", "+ user : User | null", "+ isDark : boolean", "+ interestIds : string[]", "+ releaseConfig : MobileReleaseConfig | null", "+ releaseState : AppAvailabilityStatus"],
        ["+ signIn(phone, pwd) : Promise<AuthResult>", "+ signUp(user, pwd) : Promise<void>", "+ updateProfile(user) : Promise<void>", "+ signOut() : Promise<void>", "+ setDarkMode(value) : Promise<void>", "+ toggleInterest(id) : Promise<void>"],
        font_title, font_body
    )
    
    boxes["MobileAuth"] = draw_staruml_class(
        draw, 80, 540, 440, "MobileAuth", "Auth Service",
        [],
        ["+ getToken() : Promise<string | null>", "+ setToken(token) : Promise<void>", "+ clearToken() : Promise<void>", "+ getCachedMobileUser() : Promise<User | null>", "+ cacheMobileUser(user) : Promise<void>", "+ clearCachedMobileUser() : Promise<void>", "+ signInMobile(phone, pwd) : Promise<User>", "+ signUpMobile(data) : Promise<User>", "+ getMobileMe() : Promise<User>", "+ updateMobileProfile(data) : Promise<User>"],
        font_title, font_body
    )
    
    boxes["AppReleaseManager"] = draw_staruml_class(
        draw, 80, 960, 440, "AppReleaseManager", "Release Service",
        ["+ apiVersion : number", "+ minSupportedAppVersion : string", "+ latestAppVersion : string", "+ maintenance : boolean"],
        ["+ getCurrentAppVersion() : string", "+ getMobileReleaseConfig() : Promise<Config>", "+ checkAppAvailability() : Promise<Status>"],
        font_title, font_body
    )

    boxes["AppUpdateService"] = draw_staruml_class(
        draw, 80, 1300, 440, "AppUpdateService", "OTA & Store Update",
        [],
        ["+ checkForAppUpdate() : Promise<Result>", "+ downloadAndApplyAppUpdate() : Promise<void>", "+ openStoreUrl(url) : Promise<void>"],
        font_title, font_body
    )
    
    # Column 2: Data Models (X = 680)
    boxes["User"] = draw_staruml_class(
        draw, 680, 130, 420, "User", "Model / Interface",
        ["+ id : string", "+ name : string", "+ phone : string", "+ city : string", "+ bloodType : string", "+ isDonor : boolean", "+ lastDonationDate? : string"],
        [], font_title, font_body
    )
    
    boxes["BloodRequest"] = draw_staruml_class(
        draw, 680, 440, 420, "BloodRequest", "Model / Interface",
        ["+ id : string", "+ patientName : string", "+ bloodType : string", "+ units : number", "+ hospital : string", "+ city : string", "+ phone : string", "+ neededBy : string", "+ status : 'urgent' | 'normal'", "+ notes? : string"],
        [], font_title, font_body
    )
    
    boxes["BloodBankPost"] = draw_staruml_class(
        draw, 680, 800, 420, "BloodBankPost", "Model / Interface",
        ["+ id : string", "+ bloodType : string", "+ component : string", "+ unitsNeeded : number", "+ hospital : string", "+ phone : string", "+ urgency : 'critical' | 'urgent' | 'normal'", "+ isUrgent : boolean", "+ publishDate : string"],
        [], font_title, font_body
    )
    
    boxes["DonationCenter"] = draw_staruml_class(
        draw, 680, 1160, 420, "DonationCenter", "Model / Interface",
        ["+ id : string", "+ name : string", "+ address : string", "+ phone : string", "+ city : string", "+ distance? : string", "+ availability? : string"],
        [], font_title, font_body
    )

    # Column 3: API Gateway & Exceptions (X = 1300)
    boxes["Error"] = draw_staruml_class(
        draw, 1300, 130, 320, "Error", "Standard System Class",
        ["+ message : string", "+ name : string"],
        [], font_title, font_body
    )
    
    boxes["MobileApiError"] = draw_staruml_class(
        draw, 1300, 360, 440, "MobileApiError", "Exception Class",
        ["+ message : string", "+ name : string"],
        ["+ constructor(message: string)"],
        font_title, font_body
    )

    boxes["MobileApi"] = draw_staruml_class(
        draw, 1300, 640, 500, "MobileApi", "API Gateway Service",
        ["- API_BASE_URL : string"],
        ["+ getBloodBankPosts(limit, offset) : Promise<MobilePostsResponse>", "+ getBloodBankPost(id) : Promise<BloodBankPost>", "+ getBloodRequests(limit, offset) : Promise<BloodRequest[]>", "+ getDonationCenters() : Promise<DonationCenter[]>", "+ getMyDonations() : Promise<DonationsResponse>"],
        font_title, font_body
    )

    # --- CONNECTORS (Strict Orthogonal & Edge Snapped) ---
    
    # 1. AppContext -> User (Manages / Holds User)
    p_app_user = [boxes["AppContext"]["right"], (boxes["AppContext"]["right"][0] + 80, boxes["AppContext"]["right"][1]), (boxes["User"]["left"][0] - 80, boxes["User"]["left"][1]), boxes["User"]["left"]]
    draw_uml_connection(draw, p_app_user, style="solid", arrow_type="association", label="1  manages  0..1", font=font_label)

    # 2. AppContext -> MobileAuth (Uses)
    p_app_auth = [boxes["AppContext"]["bottom"], boxes["MobileAuth"]["top"]]
    draw_uml_connection(draw, p_app_auth, style="dotted", arrow_type="association", label="uses", font=font_label)

    # 3. MobileAuth -> AppReleaseManager (Checks version availability)
    p_auth_release = [boxes["MobileAuth"]["bottom"], boxes["AppReleaseManager"]["top"]]
    draw_uml_connection(draw, p_auth_release, style="dotted", arrow_type="association", label="checks availability", font=font_label)

    # 4. AppUpdateService -> AppReleaseManager (Queries config)
    p_update_release = [boxes["AppUpdateService"]["top"], boxes["AppReleaseManager"]["bottom"]]
    draw_uml_connection(draw, p_update_release, style="dotted", arrow_type="association", label="queries config", font=font_label)

    # 5. MobileAuth -> User (Caches & Authenticates)
    start_auth_r = (boxes["MobileAuth"]["x"] + boxes["MobileAuth"]["w"], boxes["MobileAuth"]["y"] + 80)
    end_user_b = (boxes["User"]["x"] + 100, boxes["User"]["y"] + boxes["User"]["h"])
    p_auth_user = [start_auth_r, (600, start_auth_r[1]), (600, end_user_b[1] + 30), (end_user_b[0], end_user_b[1] + 30), end_user_b]
    draw_uml_connection(draw, p_auth_user, style="dotted", arrow_type="association", label="caches & authenticates", font=font_label)

    # 6. MobileApi -> MobileApiError (Throws)
    p_api_err = [boxes["MobileApi"]["top"], boxes["MobileApiError"]["bottom"]]
    draw_uml_connection(draw, p_api_err, style="dotted", arrow_type="association", label="throws", font=font_label)

    # 7. MobileApiError -> Error (Extends / Inheritance)
    p_err_inher = [boxes["MobileApiError"]["top"], boxes["Error"]["bottom"]]
    draw_uml_connection(draw, p_err_inher, style="solid", arrow_type="generalization", label="extends", font=font_label)

    # 8. MobileApi -> BloodRequest (Fetches)
    start_api = (boxes["MobileApi"]["left"][0], boxes["MobileApi"]["y"] + 60)
    end_br = (boxes["BloodRequest"]["right"][0], boxes["BloodRequest"]["y"] + 60)
    p_api_br = [start_api, (boxes["BloodRequest"]["right"][0] + 50, start_api[1]), (boxes["BloodRequest"]["right"][0] + 50, end_br[1]), end_br]
    draw_uml_connection(draw, p_api_br, style="dotted", arrow_type="association", label="fetches requests", font=font_label)

    # 9. MobileApi -> BloodBankPost (Fetches)
    start_api2 = (boxes["MobileApi"]["left"][0], boxes["MobileApi"]["y"] + 140)
    end_bbp = (boxes["BloodBankPost"]["right"][0], boxes["BloodBankPost"]["y"] + 80)
    p_api_bbp = [start_api2, (boxes["BloodBankPost"]["right"][0] + 60, start_api2[1]), (boxes["BloodBankPost"]["right"][0] + 60, end_bbp[1]), end_bbp]
    draw_uml_connection(draw, p_api_bbp, style="dotted", arrow_type="association", label="fetches posts", font=font_label)

    # 10. MobileApi -> DonationCenter (Fetches)
    start_api3 = (boxes["MobileApi"]["left"][0], boxes["MobileApi"]["y"] + 220)
    end_dc = (boxes["DonationCenter"]["right"][0], boxes["DonationCenter"]["y"] + 80)
    p_api_dc = [start_api3, (boxes["DonationCenter"]["right"][0] + 70, start_api3[1]), (boxes["DonationCenter"]["right"][0] + 70, end_dc[1]), end_dc]
    draw_uml_connection(draw, p_api_dc, style="dotted", arrow_type="association", label="fetches centers", font=font_label)

    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Saved: {output_path}")

# ==============================================================================
# Diagram 2: Nafeer Admin Management Dashboard Class Diagram
# ==============================================================================
def render_admin_diagram(output_path):
    W, H = 2800, 1850
    img = Image.new("RGB", (W, H), "#FFFFFF")
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(15, is_bold=True)
    font_body = get_font(12)
    font_label = get_font(12, is_bold=True)
    
    draw_header_title(draw, W, "Nafeer Blood Bank — Admin Management Dashboard Class Diagram", "UML Class Diagram (Drizzle ORM Entities, RBAC & Core Backend Services with Connected Arrows)")
    
    boxes = {}
    
    # Layer 1: Core System & Auth Models (Left Column, X = 80)
    boxes["User"] = draw_staruml_class(
        draw, 80, 140, 440, "User", "Entity / DB Table: users",
        ["+ id : number (PK)", "+ username : string (Unique)", "+ fullName : string", "+ passwordHash : string", "+ role : string", "+ permissions : string[] (JSON)", "+ active : boolean", "+ email : string | null", "+ phone : string | null", "+ lastLoginAt : Date | null"],
        [], font_title, font_body
    )
    
    boxes["MobileUser"] = draw_staruml_class(
        draw, 80, 520, 440, "MobileUser", "Entity / DB Table: mobile_users",
        ["+ id : number (PK)", "+ name : string", "+ phone : string (Unique)", "+ city : string", "+ bloodType : string", "+ passwordHash : string", "+ active : boolean", "+ otpHash : string | null"],
        [], font_title, font_body
    )

    boxes["AuditLog"] = draw_staruml_class(
        draw, 80, 860, 440, "AuditLog", "Entity / DB Table: audit_logs",
        ["+ id : number (PK)", "+ userId : number | null", "+ username : string | null", "+ action : string", "+ entity : string", "+ entityId : string | null", "+ page : string | null", "+ ip : string | null"],
        [], font_title, font_body
    )

    boxes["SystemSetting"] = draw_staruml_class(
        draw, 80, 1200, 440, "SystemSetting", "Entity / DB Table: system_settings",
        ["+ id : number (PK)", "+ key : string (Unique)", "+ value : JSON", "+ updatedAt : Date"],
        [], font_title, font_body
    )

    # Layer 2: Clinical & Donor Operations (Middle Column 1, X = 640)
    boxes["Donor"] = draw_staruml_class(
        draw, 640, 140, 460, "Donor", "Entity / DB Table: donors",
        ["+ id : number (PK)", "+ code : string (Unique)", "+ name : string", "+ age : number", "+ gender : string", "+ phone : string | null", "+ bloodType : string", "+ eligibility : string", "+ stage : string", "+ status : string", "+ donationCount : number"],
        [], font_title, font_body
    )

    boxes["Donation"] = draw_staruml_class(
        draw, 640, 540, 460, "Donation", "Entity / DB Table: donations",
        ["+ id : number (PK)", "+ donorId : number (FK)", "+ donorCode : string", "+ donorName : string", "+ bloodType : string", "+ quantityMl : number", "+ donationDate : string", "+ status : string"],
        [], font_title, font_body
    )

    boxes["LabTest"] = draw_staruml_class(
        draw, 640, 880, 460, "LabTest", "Entity / DB Table: lab_tests",
        ["+ id : number (PK)", "+ donorId : number (FK)", "+ donorCode : string", "+ donorName : string", "+ hiv : string", "+ hepatitisB : string", "+ hepatitisC : string", "+ syphilis : string", "+ malaria : string", "+ decision : string", "+ approved : boolean"],
        [], font_title, font_body
    )

    boxes["Patient"] = draw_staruml_class(
        draw, 640, 1280, 460, "Patient", "Entity / DB Table: patients",
        ["+ id : number (PK)", "+ name : string", "+ age : number", "+ nationalId : string | null", "+ phone : string | null", "+ bloodType : string", "+ hospital : string", "+ gender : string"],
        [], font_title, font_body
    )

    # Layer 3: Inventory & Request Management (Middle Column 2, X = 1220)
    boxes["BloodUnit"] = draw_staruml_class(
        draw, 1220, 140, 460, "BloodUnit", "Entity / DB Table: blood_units",
        ["+ id : number (PK)", "+ unitNumber : string (Unique)", "+ bloodType : string", "+ rh : string", "+ component : string", "+ status : string", "+ expiryDate : string", "+ storageLocation : string", "+ sourceCode : string | null"],
        [], font_title, font_body
    )

    boxes["BloodRequest"] = draw_staruml_class(
        draw, 1220, 500, 460, "BloodRequest", "Entity / DB Table: blood_requests",
        ["+ id : number (PK)", "+ requestNumber : string (Unique)", "+ patientId : number | null (FK)", "+ patientName : string", "+ requester : string", "+ bloodType : string", "+ component : string", "+ unitsRequested : number", "+ unitsFulfilled : number", "+ priority : string", "+ status : string"],
        [], font_title, font_body
    )

    boxes["DonationPost"] = draw_staruml_class(
        draw, 1220, 920, 460, "DonationPost", "Entity / DB Table: donation_posts",
        ["+ id : number (PK)", "+ bloodType : string", "+ component : string", "+ unitsNeeded : number", "+ hospital : string", "+ urgency : string", "+ status : string"],
        [], font_title, font_body
    )

    boxes["InventoryMovement"] = draw_staruml_class(
        draw, 1220, 1240, 460, "InventoryMovement", "Entity / DB Table: inventory_movements",
        ["+ id : number (PK)", "+ unitId : number | null (FK)", "+ unitNumber : string", "+ bloodType : string", "+ type : string", "+ fromLocation : string | null", "+ toLocation : string | null", "+ performedBy : string | null"],
        [], font_title, font_body
    )

    # Layer 4: Services & Controllers (Right Column, X = 1800)
    boxes["AuthService"] = draw_staruml_class(
        draw, 1800, 140, 480, "AuthService", "Auth & Session Service",
        ["- COOKIE_NAME : string", "- secret : Uint8Array"],
        ["+ hashPassword(password) : Promise<string>", "+ verifyPassword(password, hash) : Promise<boolean>", "+ createSession(user, remember) : Promise<void>", "+ destroySession() : Promise<void>", "+ getSession() : Promise<SessionUser | null>", "+ authenticate(username, password) : Promise<SessionUser | null>"],
        font_title, font_body
    )

    boxes["RBACManager"] = draw_staruml_class(
        draw, 1800, 500, 480, "RBACManager", "Authorization Service",
        ["+ ROLE_LABELS : Record<string, string>", "+ ROLE_PERMISSIONS : Record<string, string[]>", "+ ALL_PERMISSIONS : string[]"],
        ["+ can(userPermissions, resource, action) : boolean", "+ permissionsForUser(role, customPermissions) : string[]"],
        font_title, font_body
    )

    boxes["BloodBankSettingsManager"] = draw_staruml_class(
        draw, 1800, 820, 480, "BloodBankSettingsManager", "System Config Service",
        ["+ BLOOD_BANK_SETTINGS_KEY : string", "+ DEFAULT_BLOOD_BANK_SETTINGS : BloodBankSettings"],
        ["+ getBloodBankSettings() : Promise<BloodBankSettings>"],
        font_title, font_body
    )

    boxes["ServerGuard"] = draw_staruml_class(
        draw, 1800, 1100, 480, "ServerGuard", "API Security Guard",
        [],
        ["+ requirePermission(resource, action) : Promise<SessionUser>", "+ writeAudit(entry) : Promise<void>", "+ clientIp(request) : string", "+ errorResponse(error) : Response"],
        font_title, font_body
    )

    # --- CONNECTORS (Strict Orthogonal & Edge Snapped) ---

    # 1. Donor -> Donation (1 makes *)
    p_donor_don = [boxes["Donor"]["bottom"], boxes["Donation"]["top"]]
    draw_uml_connection(draw, p_donor_don, style="solid", arrow_type="association", label="1  makes  *", font=font_label)

    # 2. Donor / Donation -> LabTest (1 screened by *)
    p_don_lab = [boxes["Donation"]["bottom"], boxes["LabTest"]["top"]]
    draw_uml_connection(draw, p_don_lab, style="solid", arrow_type="association", label="1  screened by  *", font=font_label)

    # 3. Donation -> BloodUnit (produces 0..1)
    p_don_unit = [boxes["Donation"]["right"], (1160, boxes["Donation"]["right"][1]), (1160, boxes["BloodUnit"]["left"][1]), boxes["BloodUnit"]["left"]]
    draw_uml_connection(draw, p_don_unit, style="solid", arrow_type="association", label="produces  0..1", font=font_label)

    # 4. Patient -> BloodRequest (1 receives *)
    p_pat_req = [boxes["Patient"]["right"], (1160, boxes["Patient"]["right"][1]), (1160, boxes["BloodRequest"]["left"][1]), boxes["BloodRequest"]["left"]]
    draw_uml_connection(draw, p_pat_req, style="solid", arrow_type="association", label="1  receives  *", font=font_label)

    # 5. BloodUnit -> BloodRequest (1 fulfilled in *)
    p_unit_req = [boxes["BloodUnit"]["bottom"], boxes["BloodRequest"]["top"]]
    draw_uml_connection(draw, p_unit_req, style="solid", arrow_type="association", label="1  fulfilled in  *", font=font_label)

    # 6. BloodRequest -> InventoryMovement (logs *)
    p_req_mov = [boxes["BloodRequest"]["bottom"], (boxes["BloodRequest"]["bottom"][0], 860), (boxes["InventoryMovement"]["top"][0], 860), boxes["InventoryMovement"]["top"]]
    draw_uml_connection(draw, p_req_mov, style="solid", arrow_type="association", label="logs  *", font=font_label)

    # 7. AuthService -> User (authenticates)
    # Loop over top edge to User top
    p_auth_user = [boxes["AuthService"]["top"], (boxes["AuthService"]["top"][0], 90), (boxes["User"]["top"][0], 90), boxes["User"]["top"]]
    draw_uml_connection(draw, p_auth_user, style="dotted", arrow_type="association", label="authenticates user", font=font_label)

    # 8. RBACManager -> User (verifies permissions)
    p_rbac_user = [boxes["RBACManager"]["left"], (560, boxes["RBACManager"]["left"][1]), (560, boxes["User"]["right"][1] + 40), (boxes["User"]["right"][0], boxes["User"]["right"][1] + 40)]
    draw_uml_connection(draw, p_rbac_user, style="dotted", arrow_type="association", label="verifies permissions", font=font_label)

    # 9. ServerGuard -> AuditLog (writes logs)
    # Loop around bottom edge
    p_guard_audit = [boxes["ServerGuard"]["bottom"], (boxes["ServerGuard"]["bottom"][0], 1620), (boxes["AuditLog"]["bottom"][0], 1620), boxes["AuditLog"]["bottom"]]
    draw_uml_connection(draw, p_guard_audit, style="dotted", arrow_type="association", label="writes audit logs", font=font_label)

    # 10. BloodBankSettingsManager -> SystemSetting (reads/writes settings)
    p_set_sys = [boxes["BloodBankSettingsManager"]["left"], (580, boxes["BloodBankSettingsManager"]["left"][1]), (580, boxes["SystemSetting"]["right"][1]), boxes["SystemSetting"]["right"]]
    draw_uml_connection(draw, p_set_sys, style="dotted", arrow_type="association", label="reads/writes settings", font=font_label)

    img.save(output_path, "PNG", dpi=(300, 300))
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    lab_dir = os.path.join(os.getcwd(), "lab")
    os.makedirs(lab_dir, exist_ok=True)
    render_android_diagram(os.path.join(lab_dir, "Nafeer_Android_Class_Diagram.png"))
    render_admin_diagram(os.path.join(lab_dir, "Nafeer_Admin_Dashboard_Class_Diagram.png"))
