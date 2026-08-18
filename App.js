import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { createClient } from "@supabase/supabase-js";

const BACKEND_URL = "https://joblink-backend-mfvd.onrender.com";

// SUPABASE FOR CV STORAGE - REPLACE WITH YOURS
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

// Bucket name is exactly CVS as you said (capital). If Supabase forces lowercase, change to 'cvs'
const CV_BUCKET = "CVS";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

const categories = ["All","Technology","Healthcare","Customer Service","Business","Finance","Marketing"];

const demoJobs = [
  { id: "demo-1", title: "Customer Support Specialist", company: "GlobalTech", location: "Remote • Worldwide", job_type: "Full-time", salary: "$35,000 - $50,000", category: "Customer Service", description: "Demo job - apply to real jobs from database.", requirements: ["Good communication skills"] },
  { id: "demo-2", title: "Junior Software Developer", company: "TechNova", location: "Toronto, Canada", job_type: "Full-time", salary: "$60,000 - $80,000", category: "Technology", description: "Demo job - apply to real jobs from database.", requirements: ["JavaScript knowledge"] },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authScreen, setAuthScreen] = useState("login");
  const [authRole, setAuthRole] = useState("job_seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [screen, setScreen] = useState("home");
  const [jobs, setJobs] = useState(demoJobs);
  const [search, setSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [appName, setAppName] = useState("");
  const [appEmail, setAppEmail] = useState("");
  const [appPhone, setAppPhone] = useState("");
  const [appCv, setAppCv] = useState("");
  const [appCover, setAppCover] = useState("");
  const [cvUploading, setCvUploading] = useState(false);
  const [employerApps, setEmployerApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobType, setJobType] = useState("Full-time");
  const [jobCategory, setJobCategory] = useState("Technology");
  const [jobDescription, setJobDescription] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [postingLoading, setPostingLoading] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("accessToken");
        const savedUser = await AsyncStorage.getItem("user");
        if (savedToken && savedUser) {
          setAccessToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {}
    };
    restoreSession();
    loadJobs();
  }, []);

  async function handleSignup() {
    setAuthError("");
    if (!fullName.trim()) return setAuthError("Please enter your full name.");
    if (!email.trim()) return setAuthError("Please enter your email.");
    if (!password) return setAuthError("Please enter a password.");
    if (password.length < 6) return setAuthError("Password must be at least 6 characters.");
    try {
      setAuthLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, full_name: fullName.trim(), role: authRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed.");
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
        setUser(data.user);
        await AsyncStorage.setItem("accessToken", data.session.access_token);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));
        setEmail(""); setPassword(""); setFullName(""); setAuthError("");
        Alert.alert("Success", authRole === "employer"? "HR account created." : "Account created.");
        setScreen(authRole === "employer"? "employerDashboard" : "home");
        return;
      }
      Alert.alert("Account created", "Please log in.");
      setPassword(""); setAuthScreen("login");
    } catch (e) { setAuthError(e.message); } finally { setAuthLoading(false); }
  }

  async function handleLogin() {
    setAuthError("");
    if (!email.trim() ||!password) return setAuthError("Please enter email and password.");
    try {
      setAuthLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
        await AsyncStorage.setItem("accessToken", data.session.access_token);
      }
      setUser(data.user);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
      setPassword(""); setAuthError("");
      setScreen(data.user?.role === "employer"? "employerDashboard" : "home");
    } catch (e) { setAuthError(e.message); } finally { setAuthLoading(false); }
  }

  async function loadJobs() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs`);
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) setJobs(data);
    } catch {}
  }

  async function loadEmployerApplications() {
    try {
      setAppsLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/employer/applications`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (res.ok) setEmployerApps(data);
    } catch {} finally { setAppsLoading(false); }
  }

  function openJob(job) { setSelectedJob(job); setShowApplyForm(false); setScreen("details"); }
  function toggleSave(job) {
    const exists = savedJobs.some((i) => i.id === job.id);
    if (exists) setSavedJobs(savedJobs.filter((i) => i.id!== job.id));
    else setSavedJobs([...savedJobs, job]);
  }
  function isSaved(job) { return savedJobs.some((i) => i.id === job.id); }

  const filteredJobs = jobs.filter((job) => {
    const s = search.toLowerCase().trim(); const l = locationSearch.toLowerCase().trim();
    const matchesSearch =!s || (job.title || "").toLowerCase().includes(s) || (job.company || "").toLowerCase().includes(s);
    const matchesLocation =!l || (job.location || "").toLowerCase().includes(l);
    const matchesCategory = selectedCategory === "All" || job.category === selectedCategory;
    return matchesSearch && matchesLocation && matchesCategory;
  });

  function handleJobApply() {
    if (!selectedJob) return;
    if (selectedJob.id?.toString().startsWith("demo-")) { Alert.alert("Demo Job", "Please apply to real jobs from database."); return; }
    if (!user ||!accessToken) {
      Alert.alert("Login Required", "Login as Job Seeker to apply.", [
        { text: "Login", onPress: () => { setAuthRole("job_seeker"); setAuthScreen("login"); setScreen("auth"); } },
        { text: "Cancel", style: "cancel" },
      ]); return;
    }
    if (user.role === "employer") { Alert.alert("HR Account", "Employers cannot apply."); return; }
    if (selectedJob.application_url) {
      Alert.alert("External Application", `Apply on company website:\n${selectedJob.application_url}`, [
        { text: "Open Website", onPress: () => Linking.openURL(selectedJob.application_url) },
        { text: "Apply Inside App", onPress: () => { setAppName(user.full_name || ""); setAppEmail(user.email || ""); setShowApplyForm(true); } },
        { text: "Cancel", style: "cancel" },
      ]); return;
    }
    if (selectedJob.application_email) {
      Alert.alert("Email Application", `Employer wants CV at: ${selectedJob.application_email}`, [
        { text: "Open Email", onPress: () => Linking.openURL(`mailto:${selectedJob.application_email}?subject=Application for ${selectedJob.title}`) },
        { text: "Apply Inside App", onPress: () => { setAppName(user.full_name || ""); setAppEmail(user.email || ""); setShowApplyForm(true); } },
        { text: "Cancel", style: "cancel" },
      ]); return;
    }
    setAppName(user.full_name || ""); setAppEmail(user.email || ""); setAppPhone(""); setAppCv(""); setAppCover(""); setShowApplyForm(true);
  }

  async function pickAndUploadCV() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setCvUploading(true);
      const resp = await fetch(file.uri);
      const arrayBuffer = await (await resp.blob()).arrayBuffer();
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from(CV_BUCKET).upload(path, arrayBuffer, { contentType: file.mimeType || "application/pdf", upsert: false });
      if (uploadError) {
        const { error: err2 } = await supabase.storage.from("cvs").upload(path, arrayBuffer, { contentType: file.mimeType || "application/pdf" });
        if (err2) throw uploadError;
        const { data } = supabase.storage.from("cvs").getPublicUrl(path);
        setAppCv(data.publicUrl);
        Alert.alert("CV Uploaded", "Saved to Supabase bucket cvs, will show in HR dashboard");
      } else {
        const { data } = supabase.storage.from(CV_BUCKET).getPublicUrl(path);
        setAppCv(data.publicUrl);
        Alert.alert("CV Uploaded", `Saved to bucket ${CV_BUCKET}`);
      }
    } catch (e) { Alert.alert("Upload failed", e.message); } finally { setCvUploading(false); }
  }

  async function submitApplication() {
    if (!appName.trim() ||!appEmail.trim() ||!appPhone.trim()) { Alert.alert("Missing", "Name, Email and Phone are required."); return; }
    if (!appCv.trim()) { Alert.alert("Missing", "Please upload your CV in the box above."); return; }
    try {
      setApplying(true);
      const res = await fetch(`${BACKEND_URL}/api/jobs/${selectedJob.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ applicant_name: appName.trim(), applicant_email: appEmail.trim(), phone: appPhone.trim(), cv_url: appCv.trim(), cover_letter: appCover.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      Alert.alert("Success", "Application sent! HR will see your CV.");
      setShowApplyForm(false); setScreen("home");
    } catch (e) { Alert.alert("Error", e.message); } finally { setApplying(false); }
  }

  async function submitJob() {
    if (!user ||!accessToken || user.role!== "employer") { Alert.alert("Employer login required"); setAuthRole("employer"); setAuthScreen("login"); setScreen("auth"); return; }
    if (!jobTitle.trim() ||!companyName.trim() ||!jobLocation.trim() ||!jobDescription.trim()) { Alert.alert("Missing", "Fill all required fields."); return; }
    if (!jobRequirements.trim()) { Alert.alert("Missing", "Add job requirements"); return; }
    try {
      setPostingLoading(true);
      const reqArray = jobRequirements.split("\n").map(s => s.trim()).filter(Boolean);
      const res = await fetch(`${BACKEND_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title: jobTitle.trim(), company: companyName.trim(), location: jobLocation.trim(),
          job_type: jobType, category: jobCategory, salary: jobSalary.trim() || null,
          description: jobDescription.trim(),
          requirements: reqArray,
          application_email: applicationEmail.trim() || null,
          application_url: applicationUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      Alert.alert("Submitted", "Job posted with requirements.");
      setJobTitle(""); setCompanyName(""); setJobLocation(""); setJobSalary(""); setJobDescription(""); setJobRequirements(""); setApplicationEmail(""); setApplicationUrl("");
      setScreen("employerDashboard");
    } catch (e) { Alert.alert("Failed", e.message); } finally { setPostingLoading(false); }
  }

  async function logout() {
    setUser(null); setAccessToken(null);
    await AsyncStorage.removeItem("accessToken"); await AsyncStorage.removeItem("user");
    setEmail(""); setPassword(""); setFullName(""); setScreen("home");
  }
  function goToEmployerAuth() { setAuthRole("employer"); setAuthScreen("login"); setScreen("auth"); }

  if (screen === "auth") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios"? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => setScreen("home")}><Text style={styles.formBack}>‹ Back to Jobs</Text></TouchableOpacity>
            <Text style={styles.authLogo}>JobLink</Text>
            <Text style={styles.authTitle}>{authScreen === "login"? "Login" : "Create Account"}</Text>
            {authScreen === "signup" && (<>
              <Text style={styles.roleQuestion}>I am:</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity style={[styles.roleButton, authRole === "job_seeker" && styles.roleButtonActive]} onPress={() => setAuthRole("job_seeker")}><Text style={[styles.roleText, authRole === "job_seeker" && styles.roleTextActive]}>👤 Job Seeker</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.roleButton, authRole === "employer" && styles.roleButtonActive]} onPress={() => setAuthRole("employer")}><Text style={[styles.roleText, authRole === "employer" && styles.roleTextActive]}>👔 Employer</Text></TouchableOpacity>
              </View>
              <TextInput style={styles.authInput} placeholder="Full name" value={fullName} onChangeText={setFullName} />
            </>)}
            <TextInput style={styles.authInput} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={styles.authInput} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            {authError? <Text style={styles.authError}>{authError}</Text> : null}
            <TouchableOpacity style={styles.authButton} onPress={authScreen === "login"? handleLogin : handleSignup}>
              {authLoading? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>{authScreen === "login"? "Login" : "Create Account"}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAuthScreen(authScreen === "login"? "signup" : "login")}><Text style={styles.authSwitch}>{authScreen === "login"? "Don't have account? Sign up" : "Have account? Login"}</Text></TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === "details" && selectedJob) {
    if (showApplyForm) {
      return (
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios"? "padding" : "height"}>
            <ScrollView contentContainerStyle={[styles.form, { paddingBottom: 150 }]} keyboardShouldPersistTaps="handled">
              <TouchableOpacity onPress={() => setShowApplyForm(false)}><Text style={styles.formBack}>‹ Back to Job</Text></TouchableOpacity>
              <Text style={styles.pageTitle}>Apply: {selectedJob.title}</Text>
              <Text style={styles.formSubtitle}>HR will receive your CV from Supabase bucket CVS</Text>
              <FormLabel text="Full Name *" /><TextInput style={styles.input} value={appName} onChangeText={setAppName} placeholder="John Doe" />
              <FormLabel text="Email *" /><TextInput style={styles.input} value={appEmail} onChangeText={setAppEmail} placeholder="john@email.com" keyboardType="email-address" autoCapitalize="none" />
              <FormLabel text="Phone Number *" /><TextInput style={styles.input} value={appPhone} onChangeText={setAppPhone} placeholder="+44 7123 456789" keyboardType="phone-pad" />
              <FormLabel text="Upload CV to CVS bucket *" />
              <TouchableOpacity style={styles.cvUploadBox} onPress={pickAndUploadCV} activeOpacity={0.7}>
                {cvUploading? <ActivityIndicator /> : <>
                  <Text style={{ fontSize: 32 }}>📄</Text>
                  <Text style={{ fontWeight: "bold", marginTop: 8 }}>{appCv? "CV Uploaded ✓" : "Tap to upload CV"}</Text>
                  <Text style={{ color: "#666", fontSize: 12, marginTop: 4, textAlign: "center" }}>{appCv? appCv.substring(0,50)+"..." : "PDF, DOC, DOCX\nSaved to CVS bucket\nWill appear in HR dashboard"}</Text>
                </>}
              </TouchableOpacity>
              {appCv? <TouchableOpacity onPress={() => Linking.openURL(appCv)}><Text style={{ color: "#2563EB", marginBottom: 10 }}>Open uploaded CV →</Text></TouchableOpacity> : null}
              <FormLabel text="Cover Letter" /><TextInput style={[styles.input, styles.textArea]} value={appCover} onChangeText={setAppCover} placeholder="Why are you a good fit?" multiline />
              <TouchableOpacity style={[styles.applyButton, applying && styles.disabledButton]} onPress={submitApplication} disabled={applying}>
                {applying? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>Send Application →</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity onPress={() => setScreen("home")}><Text style={styles.backButton}>‹</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <TouchableOpacity onPress={() => toggleSave(selectedJob)}><Text style={styles.saveIcon}>{isSaved(selectedJob)? "♥" : "♡"}</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.detailsContent}>
          <View style={styles.largeLogo}><Text style={styles.largeLogoText}>{(selectedJob.company || "J").charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.detailsTitle}>{selectedJob.title}</Text>
          <Text style={styles.detailsCompany}>{selectedJob.company}</Text>
          <InfoRow icon="📍" text={selectedJob.location} />
          <InfoRow icon="💼" text={selectedJob.job_type || "Full-time"} />
          <InfoRow icon="💰" text={selectedJob.salary || "Not specified"} />
          <InfoRow icon="🏷️" text={selectedJob.category || "Other"} />
          <Text style={styles.sectionHeading}>Requirements</Text>
          <View style={{ backgroundColor: "#EEF2FF", padding: 12, borderRadius: 10 }}>
            {Array.isArray(selectedJob.requirements)? selectedJob.requirements.map((r,i)=><Text key={i} style={styles.description}>• {r}</Text>) : <Text style={styles.description}>{selectedJob.requirements || "No requirements listed"}</Text>}
          </View>
          <Text style={styles.sectionHeading}>About</Text><Text style={styles.description}>{selectedJob.description}</Text>
          <TouchableOpacity style={styles.applyButton} onPress={handleJobApply}><Text style={styles.applyText}>{selectedJob.application_url? "Apply on Company Site →" : "Apply for Free →"}</Text></TouchableOpacity>
        </ScrollView>
        <BottomNav screen={screen} setScreen={setScreen} user={user} goToAuth={goToEmployerAuth} />
      </SafeAreaView>
    );
  }

  if (screen === "employerApps") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setScreen("employerDashboard")}><Text style={styles.formBack}>‹ Dashboard</Text></TouchableOpacity>
          <Text style={styles.pageTitle}>Applications ({employerApps.length})</Text>
          {appsLoading? <ActivityIndicator /> : employerApps.length === 0? <EmptyState icon="📭" title="No applications yet" text="When seekers upload CV to CVS bucket, they will appear here." /> :
            employerApps.map((app) => (
              <View key={app.id} style={styles.jobCard}>
                <Text style={styles.jobTitle}>{app.jobs?.title}</Text>
                <Text style={{ color: "#2563EB", fontWeight: "900", marginTop: 6 }}>{app.applicant_name}</Text>
                <Text style={styles.jobLocation}>📧 {app.applicant_email}</Text>
                <Text style={styles.jobLocation}>📞 {app.phone || "No phone"}</Text>
                <Text style={styles.jobLocation}>🔗 CV Bucket: {app.cv_url? "CVS" : "No CV"}</Text>
                {app.cv_url? <TouchableOpacity style={[styles.dashboardButton, { marginTop: 8, padding: 12 }]} onPress={() => Linking.openURL(app.cv_url)}><Text style={styles.dashboardButtonText}>📄 View / Download CV</Text></TouchableOpacity> : null}
                <Text style={[styles.description, { marginTop: 10, fontStyle: "italic" }]}>{app.cover_letter || "No cover letter"}</Text>
                <Text style={styles.jobLocation}>🕒 {new Date(app.created_at).toLocaleString()}</Text>
              </View>
            ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === "employerDashboard") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.logo}>JobLink</Text><Text style={styles.pageTitle}>HR Dashboard</Text>
          <Text style={styles.dashboardWelcome}>Welcome, {user?.full_name || "Employer"}</Text>
          <View style={styles.hrCard}><Text style={styles.hrCardTitle}>👔 {user?.email}</Text><Text style={styles.hrCardText}>Post jobs with requirements and receive CVs from bucket CVS.</Text></View>
          <TouchableOpacity style={styles.dashboardButton} onPress={() => setScreen("postJob")}><Text style={styles.dashboardButtonText}>+ Post New Job</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.dashboardButton, { backgroundColor: "#111827", marginTop: 12 }]} onPress={() => { loadEmployerApplications(); setScreen("employerApps"); }}><Text style={styles.dashboardButtonText}>👥 View Applications ({employerApps.length}) - CVs from CVS</Text></TouchableOpacity>
          <TouchableOpacity style={styles.dashboardSecondary} onPress={() => { setScreen("home"); loadJobs(); }}><Text style={styles.dashboardSecondaryText}>Browse Jobs</Text></TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
        </ScrollView>
        <BottomNav screen={screen} setScreen={setScreen} user={user} goToAuth={goToEmployerAuth} />
      </SafeAreaView>
    );
  }

  if (screen === "postJob") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios"? "padding" : "height"}>
          <ScrollView contentContainerStyle={[styles.form, { paddingBottom: 150 }]} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => setScreen("employerDashboard")}><Text style={styles.formBack}>‹ Dashboard</Text></TouchableOpacity>
            <Text style={styles.pageTitle}>Post a Job</Text>
            <Text style={styles.formSubtitle}>Add requirements field. Leave URL empty to receive CVs in CVS bucket.</Text>
            <FormLabel text="Job Title *" /><TextInput style={styles.input} value={jobTitle} onChangeText={setJobTitle} placeholder="e.g. Software Developer" />
            <FormLabel text="Company Name *" /><TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Company name" />
            <FormLabel text="Location *" /><TextInput style={styles.input} value={jobLocation} onChangeText={setJobLocation} placeholder="London, UK / Remote" />
            <FormLabel text="Salary" /><TextInput style={styles.input} value={jobSalary} onChangeText={setJobSalary} placeholder="$50,000 - $70,000" />
            <FormLabel text="Requirements * (each line = one requirement)" />
            <TextInput style={[styles.input, styles.textArea, { height: 120, borderWidth: 1.5, borderColor: "#000" }]} value={jobRequirements} onChangeText={setJobRequirements} placeholder={"e.g.\n2+ years React\nDegree in CS\nGood communication"} multiline />
            <FormLabel text="Job Description *" /><TextInput style={[styles.input, styles.textArea]} value={jobDescription} onChangeText={setJobDescription} placeholder="Describe the job..." multiline />
            <FormLabel text="External Application URL (optional)" /><TextInput style={styles.input} value={applicationUrl} onChangeText={setApplicationUrl} placeholder="https://company.com/apply" autoCapitalize="none" />
            <FormLabel text="External Application Email (optional)" /><TextInput style={styles.input} value={applicationEmail} onChangeText={setApplicationEmail} placeholder="hr@company.com" autoCapitalize="none" />
            <TouchableOpacity style={[styles.applyButton, postingLoading && styles.disabledButton]} onPress={submitJob} disabled={postingLoading}>
              {postingLoading? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>Publish Job with Requirements</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === "saved") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.logo}>JobLink</Text><Text style={styles.pageTitle}>Saved Jobs</Text>
          {savedJobs.length === 0? <EmptyState icon="♡" title="No saved jobs" text="Save jobs here." /> : savedJobs.map((job) => <JobCard key={job.id} job={job} saved={true} onPress={() => openJob(job)} onSave={() => toggleSave(job)} />)}
        </ScrollView>
        <BottomNav screen={screen} setScreen={setScreen} user={user} goToAuth={goToEmployerAuth} />
      </SafeAreaView>
    );
  }

  if (screen === "profile") {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.profile}>
          <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{(user?.full_name || "G").charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.profileName}>{user?.full_name || "Guest"}</Text>
          <Text style={styles.profileSubtitle}>{user?.email || "Browsing without account"}</Text>
          {!user? <TouchableOpacity style={styles.profileButton} onPress={goToEmployerAuth}><Text style={styles.profileButtonText}>👔 HR Login</Text></TouchableOpacity> :
            <><TouchableOpacity style={styles.profileButton} onPress={() => { if (user.role === "employer") { loadEmployerApplications(); setScreen("employerApps"); } }}><Text style={styles.profileButtonText}>{user.role === "employer"? "👥 View Applications" : "My Profile"}</Text></TouchableOpacity><TouchableOpacity style={[styles.profileButton, styles.logoutButton]} onPress={logout}><Text style={styles.logoutText}>Logout (manual only)</Text></TouchableOpacity></>}
        </ScrollView>
        <BottomNav screen={screen} setScreen={setScreen} user={user} goToAuth={goToEmployerAuth} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios"? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}><View><Text style={styles.logo}>JobLink</Text><Text style={styles.tagline}>No login needed to browse - stays logged in</Text></View>
            {user? <TouchableOpacity onPress={() => setScreen(user.role === "employer"? "employerDashboard" : "profile")}><Text style={{ color: "#2563EB", fontWeight: "900" }}>{user.full_name?.split(" ")[0]}</Text></TouchableOpacity> :
              <TouchableOpacity style={{ backgroundColor: "#EEF2FF", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }} onPress={goToEmployerAuth}><Text style={{ color: "#2563EB", fontWeight: "900", fontSize: 12 }}>👔 Post Job</Text></TouchableOpacity>}
          </View>
          <View style={styles.hero}><Text style={styles.heroTitle}>Find a job you'll love.</Text><Text style={styles.heroSubtitle}>Discover opportunities. Keyboard fixed, login persists.</Text></View>
          <View style={styles.searchBox}><Text style={styles.searchIcon}>🔎</Text><TextInput style={styles.searchInput} placeholder="Job title, company" value={search} onChangeText={setSearch} /></View>
          <View style={styles.locationBox}><Text style={styles.locationIcon}>📍</Text><TextInput style={styles.locationInput} placeholder="Location or Remote" value={locationSearch} onChangeText={setLocationSearch} /></View>
          <TouchableOpacity style={styles.searchButton} onPress={loadJobs}><Text style={styles.searchButtonText}>Search Jobs</Text></TouchableOpacity>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Categories</Text><Text style={styles.seeAll}>{filteredJobs.length} jobs</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map((c) => (<TouchableOpacity key={c} style={[styles.category, selectedCategory === c && styles.categoryActive]} onPress={() => setSelectedCategory(c)}><Text style={[styles.categoryText, selectedCategory === c && styles.categoryTextActive]}>{c}</Text></TouchableOpacity>))}</ScrollView>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recommended Jobs</Text></View>
          {filteredJobs.map((job) => <JobCard key={job.id} job={job} saved={isSaved(job)} onPress={() => openJob(job)} onSave={() => toggleSave(job)} />)}
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNav screen={screen} setScreen={setScreen} user={user} goToAuth={goToEmployerAuth} />
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }) { return (<View style={styles.infoRow}><Text style={styles.infoIcon}>{icon}</Text><Text style={styles.infoText}>{text}</Text></View>); }
function FormLabel({ text }) { return (<Text style={styles.label}>{text}</Text>); }
function EmptyState({ icon, title, text }) { return (<View style={styles.empty}><Text style={styles.emptyIcon}>{icon}</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>); }
function JobCard({ job, saved, onPress, onSave }) {
  return (
    <TouchableOpacity style={styles.jobCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.jobTop}><View style={styles.companyLogo}><Text style={styles.companyLogoText}>{(job.company || "J").charAt(0).toUpperCase()}</Text></View><TouchableOpacity onPress={(e) => { e.stopPropagation(); onSave(); }}><Text style={styles.heart}>{saved? "♥" : "♡"}</Text></TouchableOpacity></View>
      <Text style={styles.jobTitle}>{job.title}</Text><Text style={styles.company}>{job.company}</Text><Text style={styles.jobLocation}>📍 {job.location} {job.application_url? "🔗 External" : ""}</Text>
      <View style={styles.tags}><View style={styles.tag}><Text style={styles.tagText}>{job.job_type || "Full-time"}</Text></View><View style={styles.tag}><Text style={styles.tagText}>{job.category || "Other"}</Text></View></View>
      <View style={styles.jobBottom}><Text style={styles.salary}>{job.salary || "No salary"}</Text><Text style={styles.viewJob}>View →</Text></View>
    </TouchableOpacity>
  );
}
function BottomNav({ screen, setScreen, user, goToAuth }) {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("home")}><Text style={[styles.navIcon, screen === "home" && styles.navActive]}>🏠</Text><Text style={[styles.navText, screen === "home" && styles.navActive]}>Home</Text></TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("home")}><Text style={styles.navIcon}>🔎</Text><Text style={styles.navText}>Search</Text></TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => setScreen("saved")}><Text style={[styles.navIcon, screen === "saved" && styles.navActive]}>♡</Text><Text style={[styles.navText, screen === "saved" && styles.navActive]}>Saved</Text></TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => { if (!user) goToAuth(); else setScreen(user.role === "employer"? "employerDashboard" : "profile"); }}><Text style={[styles.navIcon, (screen === "profile" || screen === "employerDashboard") && styles.navActive]}>{user? "👤" : "👔"}</Text><Text style={[styles.navText, (screen === "profile" || screen === "employerDashboard") && styles.navActive]}>{user? "Profile" : "HR"}</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FC" },
  authContainer: { flexGrow: 1, justifyContent: "center", padding: 24, paddingBottom: 100 },
  authLogo: { fontSize: 40, fontWeight: "900", color: "#172554", textAlign: "center", marginBottom: 30 },
  authTitle: { fontSize: 28, fontWeight: "900", textAlign: "center" },
  roleQuestion: { fontSize: 13, fontWeight: "800", marginBottom: 9 },
  roleRow: { flexDirection: "row", marginBottom: 15 },
  roleButton: { flex: 1, paddingVertical: 13, borderWidth: 1, borderColor: "#E1E5EC", backgroundColor: "#fff", borderRadius: 12, marginRight: 7, alignItems: "center" },
  roleButtonActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  roleText: { fontSize: 12, fontWeight: "800", color: "#475569" },
  roleTextActive: { color: "#fff" },
  authInput: { height: 55, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E1E5EC", borderRadius: 14, paddingHorizontal: 16, marginBottom: 12 },
  authError: { color: "#DC2626", textAlign: "center", marginBottom: 12 },
  authButton: { height: 55, backgroundColor: "#2563EB", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  disabledButton: { opacity: 0.6 },
  authButtonText: { color: "#fff", fontWeight: "900" },
  authSwitch: { color: "#2563EB", textAlign: "center", fontWeight: "700", marginTop: 20 },
  content: { padding: 20, paddingBottom: 110 },
  topBar: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  logo: { fontSize: 30, fontWeight: "900", color: "#172554" },
  tagline: { color: "#7A8499", fontSize: 12 },
  hero: { marginBottom: 22 },
  heroTitle: { fontSize: 31, fontWeight: "900", color: "#111827", lineHeight: 38 },
  heroSubtitle: { color: "#6B7280", fontSize: 15, lineHeight: 22, marginTop: 8 },
  searchBox: { height: 57, backgroundColor: "#fff", borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, borderWidth: 1, borderColor: "#E5E7EB" },
  searchIcon: { fontSize: 18, marginRight: 9 },
  searchInput: { flex: 1 },
  locationBox: { height: 57, backgroundColor: "#fff", borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 10 },
  locationIcon: { fontSize: 18, marginRight: 9 },
  locationInput: { flex: 1 },
  searchButton: { height: 55, backgroundColor: "#2563EB", borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 12 },
  searchButtonText: { color: "#fff", fontWeight: "900" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 28, marginBottom: 13 },
  sectionTitle: { fontSize: 19, fontWeight: "900" },
  seeAll: { color: "#2563EB", fontWeight: "800" },
  category: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 17, paddingVertical: 11, borderRadius: 22, marginRight: 8 },
  categoryActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  categoryText: { color: "#475569", fontWeight: "700", fontSize: 12 },
  categoryTextActive: { color: "#fff" },
  jobCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: "#E8EAF0" },
  jobTop: { flexDirection: "row", justifyContent: "space-between" },
  companyLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  companyLogoText: { fontSize: 20, fontWeight: "900", color: "#2563EB" },
  heart: { fontSize: 27, color: "#2563EB" },
  jobTitle: { fontSize: 17, fontWeight: "900", marginTop: 14 },
  company: { color: "#6B7280", marginTop: 5 },
  jobLocation: { color: "#6B7280", fontSize: 12, marginTop: 8 },
  tags: { flexDirection: "row", marginTop: 13 },
  tag: { backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 7 },
  tagText: { color: "#475569", fontSize: 10, fontWeight: "800" },
  jobBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F0F1F4" },
  salary: { fontSize: 12, fontWeight: "900", flex: 1 },
  viewJob: { color: "#2563EB", fontWeight: "900" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 78, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#E5E7EB", flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  navItem: { alignItems: "center" },
  navIcon: { fontSize: 20 },
  navText: { fontSize: 10, color: "#7A8499", marginTop: 4 },
  navActive: { color: "#2563EB" },
  detailsHeader: { height: 65, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  backButton: { fontSize: 40 },
  headerTitle: { fontSize: 17, fontWeight: "900" },
  saveIcon: { fontSize: 28, color: "#2563EB" },
  detailsContent: { padding: 22, paddingBottom: 100 },
  largeLogo: { width: 80, height: 80, borderRadius: 22, backgroundColor: "#EEF2FF", alignSelf: "center", alignItems: "center", justifyContent: "center" },
  largeLogoText: { fontSize: 32, fontWeight: "900", color: "#2563EB" },
  detailsTitle: { fontSize: 25, fontWeight: "900", textAlign: "center", marginTop: 18 },
  detailsCompany: { textAlign: "center", color: "#6B7280", marginTop: 7 },
  infoRow: { flexDirection: "row", marginTop: 15 },
  infoIcon: { width: 30 },
  infoText: { flex: 1, color: "#374151" },
  sectionHeading: { fontSize: 18, fontWeight: "900", marginTop: 27, marginBottom: 10 },
  description: { color: "#4B5563", lineHeight: 23 },
  applyButton: { height: 56, backgroundColor: "#2563EB", borderRadius: 15, justifyContent: "center", alignItems: "center", marginTop: 25 },
  applyText: { color: "#fff", fontWeight: "900" },
  profile: { padding: 25, alignItems: "center", paddingBottom: 120 },
  profileAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginTop: 30 },
  profileAvatarText: { fontSize: 40, fontWeight: "900", color: "#2563EB" },
  profileName: { fontSize: 23, fontWeight: "900", marginTop: 20 },
  profileSubtitle: { color: "#6B7280", marginTop: 8 },
  profileButton: { width: "100%", backgroundColor: "#fff", padding: 18, borderRadius: 15, marginTop: 13, borderWidth: 1, borderColor: "#E5E7EB" },
  profileButtonText: { fontWeight: "900" },
  logoutButton: { borderColor: "#FECACA", marginTop: 25, backgroundColor: "#fff", padding: 18, borderRadius: 15, borderWidth: 1, width: "100%" },
  logoutText: { color: "#DC2626", fontWeight: "900", textAlign: "center" },
  form: { padding: 22, paddingBottom: 50 },
  formBack: { color: "#2563EB", fontWeight: "900", marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: "900" },
  formSubtitle: { color: "#6B7280", marginTop: 7, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "900", marginTop: 15, marginBottom: 7 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E1E5EC", borderRadius: 13, padding: 15 },
  textArea: { height: 120, textAlignVertical: "top" },
  cvUploadBox: { borderWidth: 2, borderColor: "#2563EB", borderStyle: "dashed", borderRadius: 16, padding: 26, alignItems: "center", backgroundColor: "#F8FAFF", marginBottom: 10, minHeight: 140 },
  hrCard: { backgroundColor: "#fff", borderRadius: 18, padding: 20, marginTop: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  hrCardTitle: { fontSize: 14, fontWeight: "900" },
  hrCardText: { color: "#6B7280", marginTop: 10 },
  dashboardWelcome: { color: "#6B7280", marginTop: 8 },
  dashboardButton: { backgroundColor: "#2563EB", borderRadius: 15, padding: 18, marginTop: 20, alignItems: "center" },
  dashboardButtonText: { color: "#fff", fontWeight: "900" },
  dashboardSecondary: { backgroundColor: "#fff", borderRadius: 15, padding: 18, marginTop: 12, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  dashboardSecondaryText: { color: "#2563EB", fontWeight: "900" },
  empty: { alignItems: "center", padding: 45 },
  emptyIcon: { fontSize: 45 },
  emptyTitle: { fontSize: 19, fontWeight: "900", marginTop: 12 },
  emptyText: { textAlign: "center", color: "#6B7280", marginTop: 7 },
});
