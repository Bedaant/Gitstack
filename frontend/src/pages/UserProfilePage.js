import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { API } from "../utils/api";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Github, Globe, Share2, Edit2, ChevronDown, ChevronUp, Star, Loader2, Briefcase, BadgeCheck } from "lucide-react";

const EditProfilePanel = ({ profile, onSave, onCancel }) => {
  const [form, setForm] = useState({
    github_username: profile.github_username || "",
    bio: profile.bio || "",
    website: profile.website || "",
    skills: (profile.skills || []).join(", "),
    public_profile: profile.public_profile !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/users/me`, {
        github_username: form.github_username || null,
        bio: form.bio || null,
        website: form.website || null,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        public_profile: form.public_profile,
      }, { withCredentials: true });
      toast.success("Profile updated!");
      onSave(res.data);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="neo-card p-6 mb-8 bg-muted/30">
      <h3 className="font-black text-lg mb-4 uppercase tracking-wide">Edit Profile</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">GitHub Username</label>
          <input
            value={form.github_username}
            onChange={e => setForm(f => ({ ...f, github_username: e.target.value }))}
            className="neo-input px-3 py-2 w-full"
            placeholder="e.g. torvalds"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Website</label>
          <input
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            className="neo-input px-3 py-2 w-full"
            placeholder="https://yoursite.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold mb-1">Bio <span className="text-muted-foreground font-normal">(max 300 chars)</span></label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            maxLength={300}
            rows={2}
            className="neo-input px-3 py-2 w-full resize-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold mb-1">Skills <span className="text-muted-foreground font-normal">(comma-separated, max 20)</span></label>
          <input
            value={form.skills}
            onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
            className="neo-input px-3 py-2 w-full"
            placeholder="React, Python, TypeScript, FastAPI"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="public_profile"
            checked={form.public_profile}
            onChange={e => setForm(f => ({ ...f, public_profile: e.target.checked }))}
            className="w-4 h-4 border-2 border-black"
          />
          <label htmlFor="public_profile" className="text-sm font-bold cursor-pointer">Public profile (visible to everyone)</label>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="neo-btn neo-btn-primary px-5 py-2 font-black flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
        </button>
        <button onClick={onCancel} className="neo-btn px-4 py-2 font-bold">Cancel</button>
      </div>
    </div>
  );
};

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stacks, setStacks] = useState([]);
  const [products, setProducts] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [expandedRepo, setExpandedRepo] = useState(null);
  const [translatingRepo, setTranslatingRepo] = useState(null);

  const isOwnProfile = currentUser?.user_id === userId;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, reposRes] = await Promise.all([
          axios.get(`${API}/users/${userId}`),
          axios.get(`${API}/users/${userId}/repos`),
        ]);
        setProfile(profileRes.data.user);
        setStacks(profileRes.data.stacks || []);
        setProducts(profileRes.data.products || []);
        setRepos(reposRes.data.repos || []);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userId]);

  const expandRepo = async (repo) => {
    if (expandedRepo === repo.full_name) {
      setExpandedRepo(null);
      return;
    }
    setExpandedRepo(repo.full_name);
    if (!repo.translation) {
      setTranslatingRepo(repo.full_name);
      try {
        const [owner, name] = repo.full_name.split("/");
        const res = await axios.get(`${API}/ai/translate-repo/${owner}/${name}`);
        setRepos(prev => prev.map(r =>
          r.full_name === repo.full_name
            ? { ...r, translation: res.data.translation || res.data.summary }
            : r
        ));
      } catch { /* ignore */ } finally {
        setTranslatingRepo(null);
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/u/${userId}`);
    toast.success("Profile URL copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-black mb-4 uppercase">Profile not found</h1>
          <p className="text-muted-foreground mb-6">This profile is private or doesn't exist.</p>
          <Link to="/" className="neo-btn neo-btn-primary px-6 py-2 font-black">Back to Home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={`${profile.name} — GitStack Profile`}
        description={profile.bio || `${profile.name}'s developer profile on GitStack`}
      />
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-12">

        {/* Profile header */}
        <div className="neo-card p-6 mb-8 flex flex-col sm:flex-row items-start gap-6">
          <img
            src={profile.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=2563EB&color=fff&size=96`}
            alt={profile.name}
            className="w-20 h-20 border-4 border-black flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl font-black uppercase tracking-tight inline-flex items-center gap-2">
                {profile.name}
                {profile.verified && <BadgeCheck className="w-5 h-5 text-primary" title="Verified Seller" />}
              </h1>
              <button
                onClick={handleShare}
                title="Share profile"
                className="p-1.5 border-2 border-black hover:bg-pastel-yellow hover:text-black transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {isOwnProfile && (
                <button
                  onClick={() => setEditMode(e => !e)}
                  className="neo-btn px-3 py-1 text-sm font-bold flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {editMode ? "Cancel" : "Edit Profile"}
                </button>
              )}
              {profile.available_for_hire && profile.hire_contact && (
                <a
                  href={profile.hire_contact.startsWith("http") ? profile.hire_contact : `mailto:${profile.hire_contact}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neo-btn neo-btn-primary px-4 py-2 flex items-center gap-2 font-black text-sm"
                >
                  <Briefcase className="w-4 h-4" /> Hire Me
                </a>
              )}
            </div>
            {profile.bio && <p className="text-muted-foreground mb-3 leading-relaxed">{profile.bio}</p>}
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              {profile.github_username && (
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Github className="w-4 h-4" /> {profile.github_username}
                </a>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
            </div>
            {profile.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.map(s => (
                  <span key={s} className="text-xs font-black bg-foreground text-background px-2 py-0.5 uppercase tracking-wide">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit panel */}
        {editMode && isOwnProfile && (
          <EditProfilePanel
            profile={profile}
            onSave={(updated) => { setProfile(prev => ({ ...prev, ...updated })); setEditMode(false); }}
            onCancel={() => setEditMode(false)}
          />
        )}

        <div className="space-y-12">

          {/* GitHub Repos */}
          {repos.length > 0 && (
            <section>
              <h2 className="text-xl font-black uppercase tracking-wide mb-4 flex items-center gap-2">
                <Github className="w-5 h-5" /> GitHub Repositories
              </h2>
              <div className="space-y-2">
                {repos.map(repo => (
                  <div key={repo.full_name} className="border-2 border-black">
                    <button
                      onClick={() => expandRepo(repo)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black">{repo.name}</span>
                          {repo.language && (
                            <span className="text-xs font-semibold bg-muted px-2 py-0.5 border border-border">{repo.language}</span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Star className="w-3 h-3" /> {repo.stars}
                          </span>
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>
                        )}
                      </div>
                      {expandedRepo === repo.full_name
                        ? <ChevronUp className="w-4 h-4 flex-shrink-0 ml-2" />
                        : <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />}
                    </button>
                    {expandedRepo === repo.full_name && (
                      <div className="border-t-2 border-black p-4 bg-muted/40">
                        {translatingRepo === repo.full_name ? (
                          <p className="text-sm text-muted-foreground animate-pulse flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> Getting AI summary...
                          </p>
                        ) : repo.translation ? (
                          <div
                            className="prose-gitstack"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(repo.translation)) }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">No summary available.</p>
                        )}
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-3"
                        >
                          <Github className="w-3 h-3" /> View on GitHub
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Published Stacks */}
          {stacks.length > 0 && (
            <section>
              <h2 className="text-xl font-black uppercase tracking-wide mb-4">Published Stacks</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stacks.map(stack => (
                  <Link
                    key={stack.slug || stack.name}
                    to={`/s/${stack.slug}`}
                    className="neo-card p-4 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-background block"
                  >
                    <div className="font-black mb-2">{stack.name}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(stack.tools || []).slice(0, 5).map(t => (
                        <span key={t} className="text-xs bg-muted px-1.5 py-0.5 border border-border font-mono">{t}</span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">{stack.copy_count || 0} copies</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Marketplace Products */}
          {products.length > 0 && (
            <section>
              <h2 className="text-xl font-black uppercase tracking-wide mb-4">Marketplace Products</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <Link
                    key={p.product_id}
                    to={`/marketplace/${p.product_id}`}
                    className="neo-card p-4 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-background block"
                  >
                    <div className="font-black mb-1 line-clamp-1">{p.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{p.tagline}</div>
                    <div className="font-black text-primary mt-2">
                      {(p.price_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state for own profile */}
          {isOwnProfile && stacks.length === 0 && repos.length === 0 && (
            <div className="neo-card p-8 text-center bg-muted/20">
              <p className="font-black text-lg mb-2">Your profile is empty</p>
              <p className="text-muted-foreground text-sm mb-4">Add your GitHub username to show your repos, or generate and publish a stack.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => setEditMode(true)} className="neo-btn neo-btn-primary px-5 py-2 font-black">
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                </button>
                <Link to="/stack-generator" className="neo-btn neo-btn-secondary px-5 py-2 font-black">
                  Generate a Stack
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
