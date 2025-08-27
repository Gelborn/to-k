import React, { useMemo, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Sparkles, LayoutGrid, Check, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

type ProjectType = "profile_card" | "exclusive_club";

type OwnerOption = {
  id: string;
  name: string;
  email?: string | null;
};

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
  ownerOptions?: OwnerOption[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  ownerOptions = [],
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType | "">("");
  const [showroomMode, setShowroomMode] = useState(false);
  const [ownerId, setOwnerId] = useState<string>("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // focus first field on open (and prevent modal refocus while typing)
  const nameRef = useRef<HTMLInputElement>(null);

  const canShowShowroom = type === "exclusive_club";

  const isValidUrl = (v: string) => {
    try {
      const u = new URL(v.trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isValid =
    name.trim().length >= 3 &&
    !!ownerId &&
    !!type &&
    isValidUrl(destinationUrl.trim());

  const ownerHint = useMemo(() => {
    const o = ownerOptions.find((x) => x.id === ownerId);
    return o ? `${o.name}${o.email ? ` · ${o.email}` : ""}` : "Select an owner";
  }, [ownerId, ownerOptions]);

  const setFieldError = (field: string, message: string) =>
    setErrors((prev) => ({ ...prev, [field]: message }));

  const clearFieldError = (field: string) =>
    setErrors((prev) => {
      const { [field]: _omit, ...rest } = prev;
      return rest;
    });

  const validate = () => {
    const e: Record<string, string> = {};
    const nm = name.trim();
    const url = destinationUrl.trim();

    if (!nm || nm.length < 3) e.name = "Name must be at least 3 characters.";
    if (!ownerId) e.ownerId = "Please select a project owner.";
    if (!type) e.type = "Please choose a project type.";
    if (!url) e.destination_url = "Destination URL is required.";
    else if (!isValidUrl(url)) e.destination_url = "Enter a valid http(s) URL.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setName("");
    setType("");
    setShowroomMode(false);
    setOwnerId("");
    setDestinationUrl("");
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        showroom_mode: canShowShowroom ? showroomMode : false,
        owner_id: ownerId,
        destination_url: destinationUrl.trim(),
      };

      const { data, error } = await supabase.functions.invoke("admin_create_project", {
        body: payload,
      });

      if (error) {
        // Try to extract the JSON error from the Edge Function
        let serverMsg: string | undefined;
        const resp = (error as any)?.context?.response as Response | undefined;
        if (resp) {
          try {
            const j = await resp.clone().json();
            serverMsg = typeof j?.error === "string" ? j.error : undefined;
            console.error("admin_create_project error resp", resp.status, j);
          } catch {
            // ignore json parse errors
          }
        } else {
          console.error("admin_create_project invoke error", error);
        }

        const msg = serverMsg || "";

        // Map known backend errors to fields
        if (/project with this name already exists/i.test(msg)) {
          setFieldError("name", "A project with this name already exists.");
        } else if (/destination_url already in use/i.test(msg)) {
          setFieldError("destination_url", "This destination URL is already in use.");
        } else if (/destination_url must be a valid http\(s\) URL/i.test(msg)) {
          setFieldError("destination_url", "Enter a valid http(s) URL.");
        } else if (/invalid owner_id .* role 'owner'/i.test(msg)) {
          setFieldError("ownerId", "Owner must be a profile with role 'owner'.");
        } else if (/showroom_mode is required/i.test(msg)) {
          setFieldError("type", "For a content hub, please set showroom mode on/off.");
        } else if (/name is required|owner_id is required|type must be/i.test(msg)) {
          toast.error(msg);
        } else {
          toast.error("Could not create project now, try again later.");
        }

        throw error; // ensure finally runs
      }

      toast.success("Project created successfully!");
      onCreated?.(data?.project_id ?? "");
      onClose();
      reset();
    } catch {
      // handled above
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create New Project"
      size="lg"
      initialFocusRef={nameRef}
    >
      {/* Vertical layout with scrollable body */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-h-[70vh]">
        {/* SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {/* Name + Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              ref={nameRef}
              label="Project Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              placeholder="Modalle Hub"
              required
              error={errors.name}
              autoComplete="off"
            />

            {/* Owner select */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                Project Owner
              </label>
              <div className="relative">
                <select
                  value={ownerId}
                  onChange={(e) => {
                    setOwnerId(e.target.value);
                    clearFieldError("ownerId");
                  }}
                  className={`w-full h-11 px-4 pr-10 bg-gray-800/50 backdrop-blur-sm border rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none
                  ${errors.ownerId ? "border-red-500/70" : "border-gray-700/50 hover:border-gray-600/70"}`}
                >
                  <option value="">{ownerHint}</option>
                  {(ownerOptions ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.email ? `· ${o.email}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              {errors.ownerId && <p className="text-xs text-red-400 mt-1">{errors.ownerId}</p>}
              <p className="text-xs text-gray-500">Set who will own/manage this project.</p>
            </div>
          </div>

          {/* Destination URL */}
          <Input
            label="Destination URL"
            value={destinationUrl}
            onChange={(e) => {
              setDestinationUrl(e.target.value);
              clearFieldError("destination_url");
            }}
            placeholder="https://your-project.com/welcome"
            required
            error={errors.destination_url}
            autoComplete="off"
          />
          <p className="text-xs text-gray-500 -mt-2">
            Your project page where users will land from tags.
          </p>

          {/* Type */}
          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
              Project Type
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile Card */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition group
                  ${type === "profile_card"
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-gray-700/50 hover:border-gray-600/70 hover:bg-gray-800/30"}`}
              >
                <input
                  type="radio"
                  name="projectType"
                  className="mt-1"
                  checked={type === "profile_card"}
                  onChange={() => {
                    setType("profile_card");
                    clearFieldError("type");
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-gray-100">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="font-medium">I wanna offer a Profile Card in this project</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    A sleek, scannable profile with links, socials, and actions.
                  </p>
                </div>
                <span className="w-5 h-5 flex items-center justify-center">
                  {type === "profile_card" && <Check className="w-5 h-5 text-blue-400" />}
                </span>
              </label>

              {/* Exclusive Club */}
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition group
                  ${type === "exclusive_club"
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-gray-700/50 hover:border-gray-600/70 hover:bg-gray-800/30"}`}
              >
                <input
                  type="radio"
                  name="projectType"
                  className="mt-1"
                  checked={type === "exclusive_club"}
                  onChange={() => {
                    setType("exclusive_club");
                    clearFieldError("type");
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-gray-100">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium">I wanna offer a content hub in this project</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    A gated hub of resources (docs, links, videos) with tag-based access.
                  </p>
                </div>
                <span className="w-5 h-5 flex items-center justify-center">
                  {type === "exclusive_club" && <Check className="w-5 h-5 text-blue-400" />}
                </span>
              </label>
            </div>

            {errors.type && <p className="text-xs text-red-400">{errors.type}</p>}
          </fieldset>

          {/* Showroom Mode (only for exclusive_club) */}
          {canShowShowroom && (
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showroomMode}
                  onChange={(e) => setShowroomMode(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="text-gray-100 font-medium">Is this project a showroom?</div>
                  <p className="text-sm text-gray-400">
                    Showroom project tags can have multiple claims/taps.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 -mx-6 px-6 py-3 border-t border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur">
          <div className="flex justify-between items-center gap-3">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Tip:</span> You can edit details later in project settings.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                  onClose();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
