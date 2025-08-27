// src/components/Owners/CreateOwnerModal.tsx
import React, { useMemo, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Mail, User2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

interface CreateOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (userId?: string) => void;
}

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const CreateOwnerModal: React.FC<CreateOwnerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // focus the first field when modal opens (and prevent panel refocus on change)
  const emailRef = useRef<HTMLInputElement>(null);

  const isValid = useMemo(
    () => isValidEmail(email) && name.trim().length >= 2,
    [email, name]
  );

  const setFieldError = (field: string, message: string) =>
    setErrors((prev) => ({ ...prev, [field]: message }));

  const clearFieldError = (field: string) =>
    setErrors((prev) => {
      const { [field]: _omit, ...rest } = prev;
      return rest;
    });

  const reset = () => {
    setEmail("");
    setName("");
    setErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!isValidEmail(email)) next.email = "Enter a valid email.";
    if (name.trim().length < 2) next.name = "Name must be at least 2 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin_create_owner", {
        body: { email: email.trim().toLowerCase(), name: name.trim() },
      });
      if (error) throw error;

      toast.success("Owner created!");
      onSuccess?.(data?.user_id);
      onClose();
      reset();
    } catch (err: any) {
      const msg: string = err?.message ?? "Failed to create owner.";

      // map known backend messages from your example function
      if (/invalid email format/i.test(msg)) {
        setFieldError("email", "Invalid email format.");
      } else if (/User with this email already exists/i.test(msg)) {
        setFieldError("email", "An account with this email already exists.");
      } else if (/name is required/i.test(msg)) {
        setFieldError("name", "Name is required.");
      } else if (/Auth required|Forbidden/i.test(msg)) {
        toast.error(msg);
      } else {
        toast.error(msg);
      }
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
      title="Create Owner"
      size="md"
      initialFocusRef={emailRef}  // ← key for the new Modal
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="grid grid-cols-1 gap-5">
          <div className="relative">
            <Input
              ref={emailRef}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              placeholder="owner@yourdomain.com"
              required
              error={errors.email}
              autoComplete="off"
            />
            <Mail className="w-4 h-4 absolute right-3 top-[38px] text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <Input
              label="Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              placeholder="e.g., Alex Modalle"
              required
              error={errors.name}
              autoComplete="off"
            />
            <User2 className="w-4 h-4 absolute right-3 top-[38px] text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
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
            {loading ? "Creating..." : "Create Owner"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
