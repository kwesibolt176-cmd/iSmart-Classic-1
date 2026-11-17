import { useState } from "react";
import { Reservation, DepositStatus } from "@/pages/Reservations";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Phone, Mail, MapPin, FileText, CreditCard, Link, Check, Copy, Trash2, Edit, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";

interface ReservationDetailsProps {
  reservation: Reservation;
  onStatusChange?: () => void;
}

export const ReservationDetails = ({ reservation, onStatusChange }: ReservationDetailsProps) => {
  const { toast } = useToast();
  const { format: formatCurrency, currencySymbol } = useCurrency();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    guestName: "",
    phone: "",
    email: "",
    date: "",
    time: "",
    guests: 1,
    notes: ""
  });

  const handleConfirmReservation = async () => {
    setIsConfirming(true);
    const { error } = await supabase
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", reservation.id);
    
    setIsConfirming(false);
    if (error) {
      toast({ title: "Error", description: "Failed to confirm reservation", variant: "destructive" });
      return;
    }
    toast({ title: "Reservation Confirmed", description: "The reservation has been confirmed." });
    onStatusChange?.();
  };

  const handleCompleteReservation = async () => {
    setIsCompleting(true);
    
    const { error: completeError } = await supabase
      .from("reservations")
      .update({ status: "completed" })
      .eq("id", reservation.id);
    
    setIsCompleting(false);
    if (completeError) {
      toast({ title: "Error", description: "Failed to complete reservation", variant: "destructive" });
      return;
    }
    toast({ title: "Reservation Completed", description: "The reservation has been marked as completed." });
    onStatusChange?.();
  };

  const handleCancelReservation = async () => {
    setIsCancelling(true);
    
    const { error: cancelError } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservation.id);
    
    setIsCancelling(false);
    if (cancelError) {
      toast({ title: "Error", description: "Failed to cancel reservation", variant: "destructive" });
      return;
    }
    toast({ title: "Reservation Cancelled", description: "The reservation has been cancelled." });
    onStatusChange?.();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      weekday: "long",
      month: "long", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  const getDepositAmount = () => {
    if (reservation.depositType === "fixed") {
      return formatCurrency(reservation.depositAmount || 0);
    } else if (reservation.depositType === "percentage") {
      return `${reservation.depositPercentage}%`;
    }
    return null;
  };

  const handleGeneratePaymentLink = async () => {
    setIsGeneratingLink(true);
    
    // Generate a simple payment link (in production, this would integrate with a payment provider)
    const baseUrl = window.location.origin;
    const paymentLink = `${baseUrl}/pay/reservation/${reservation.id}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Link expires in 7 days

    const { error } = await supabase
      .from("reservations")
      .update({
        deposit_payment_link: paymentLink,
        deposit_payment_link_expires_at: expiresAt.toISOString(),
      })
      .eq("id", reservation.id);

    setIsGeneratingLink(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to generate payment link",
        variant: "destructive",
      });
      return;
    }

    // Copy link to clipboard
    await navigator.clipboard.writeText(paymentLink);
    toast({
      title: "Payment link generated",
      description: "Link copied to clipboard. Send it to the customer.",
    });
  };

  const handleRecordPayment = async () => {
    setIsRecordingPayment(true);

    const { error } = await supabase
      .from("reservations")
      .update({
        deposit_status: "paid",
        deposit_paid_amount: reservation.depositType === "fixed" ? reservation.depositAmount : 0,
        deposit_paid_at: new Date().toISOString(),
        deposit_payment_method: "manual",
      })
      .eq("id", reservation.id);

    setIsRecordingPayment(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Payment recorded",
      description: "Deposit has been marked as paid.",
    });
  };

  const copyPaymentLink = async () => {
    if (reservation.depositPaymentLink) {
      await navigator.clipboard.writeText(reservation.depositPaymentLink);
      toast({
        title: "Copied",
        description: "Payment link copied to clipboard",
      });
    }
  };

  const handleDeleteReservation = async () => {
    setIsDeleting(true);
    
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservation.id);
    
    setIsDeleting(false);
    setShowDeleteDialog(false);
    
    if (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete reservation", 
        variant: "destructive" 
      });
      return;
    }
    
    toast({ 
      title: "Reservation Deleted", 
      description: "The reservation has been permanently deleted." 
    });
    onStatusChange?.();
  };

  const openEditDialog = () => {
    setEditFormData({
      guestName: reservation.guestName,
      phone: reservation.phone,
      email: reservation.email || "",
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      notes: reservation.notes || ""
    });
    setShowEditDialog(true);
  };

  const handleUpdateReservation = async () => {
    if (!editFormData.guestName || !editFormData.phone || !editFormData.date || !editFormData.time || !editFormData.guests) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields", 
        variant: "destructive" 
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("reservations")
        .update({
          customer_name: editFormData.guestName,
          customer_phone: editFormData.phone,
          customer_email: editFormData.email || null,
          reservation_date: editFormData.date,
          reservation_time: editFormData.time,
          party_size: editFormData.guests,
          notes: editFormData.notes || null,
        })
        .eq("id", reservation.id);

      if (error) throw error;

      toast({ 
        title: "Reservation Updated", 
        description: "The reservation has been updated successfully." 
      });
      setShowEditDialog(false);
      onStatusChange?.();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update reservation", 
        variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium text-foreground">{formatDate(reservation.date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="font-medium text-foreground">{reservation.time}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Number of Guests</p>
            <p className="font-medium text-foreground">{reservation.guests} guests</p>
          </div>
        </div>

        {reservation.tableNumber && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigned Table</p>
              <p className="font-medium text-foreground">Table {reservation.tableNumber}</p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Contact Information</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          <span>{reservation.phone}</span>
        </div>
        {reservation.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{reservation.email}</span>
          </div>
        )}
      </div>

      {reservation.notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Special Requests</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{reservation.notes}</p>
          </div>
        </>
      )}

      {/* Deposit Section */}
      {reservation.depositStatus && reservation.depositStatus !== "not_required" && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Deposit</h3>
              </div>
              <Badge 
                variant="outline"
                className={cn(
                  reservation.depositStatus === "paid" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                  reservation.depositStatus === "pending" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                  reservation.depositStatus === "refunded" && "bg-[hsl(217_91%_60%)]/10 text-[hsl(217_91%_60%)] border-[hsl(217_91%_60%)]/30"
                )}
              >
                {reservation.depositStatus === "paid" ? "Paid" : reservation.depositStatus === "pending" ? "Pending" : "Refunded"}
              </Badge>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{getDepositAmount()}</span>
              </div>
              {reservation.depositPaidAmount && reservation.depositPaidAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-emerald-500">{formatCurrency(reservation.depositPaidAmount)}</span>
                </div>
              )}
              {reservation.depositPaidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid on</span>
                  <span className="font-medium">{new Date(reservation.depositPaidAt).toLocaleDateString()}</span>
                </div>
              )}
              {reservation.depositPaymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium capitalize">{reservation.depositPaymentMethod}</span>
                </div>
              )}
            </div>

            {reservation.depositStatus === "pending" && (
              <div className="space-y-2">
                {reservation.depositPaymentLink ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={copyPaymentLink}
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleRecordPayment}
                      disabled={isRecordingPayment}
                    >
                      <Check className="w-4 h-4" />
                      {isRecordingPayment ? "Recording..." : "Mark Paid"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={handleGeneratePaymentLink}
                      disabled={isGeneratingLink}
                    >
                      <Link className="w-4 h-4" />
                      {isGeneratingLink ? "Generating..." : "Generate Link"}
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleRecordPayment}
                      disabled={isRecordingPayment}
                    >
                      <Check className="w-4 h-4" />
                      {isRecordingPayment ? "Recording..." : "Mark Paid"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        {reservation.status === "pending" && (
          <Button className="w-full" size="lg" onClick={handleConfirmReservation} disabled={isConfirming}>
            {isConfirming ? "Confirming..." : "Confirm Reservation"}
          </Button>
        )}
        {reservation.status === "confirmed" && (
          <Button className="w-full" size="lg" onClick={handleCompleteReservation} disabled={isCompleting}>
            {isCompleting ? "Completing..." : "Mark as Completed"}
          </Button>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={openEditDialog}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleCancelReservation} disabled={isCancelling}>
            {isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reservation for {reservation.guestName} on {formatDate(reservation.date)} at {reservation.time}? 
              This action cannot be undone and will permanently remove all reservation data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteReservation} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Reservation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
            <DialogDescription>
              Update the reservation details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Guest Name *</Label>
              <Input
                placeholder="John Doe"
                value={editFormData.guestName}
                onChange={(e) => setEditFormData({ ...editFormData, guestName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <PhoneInput
                  placeholder="+233 XX XXX XXXX"
                  value={editFormData.phone}
                  onChange={(value) => setEditFormData({ ...editFormData, phone: value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={editFormData.time}
                  onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Number of Guests *</Label>
              <Input
                type="number"
                min="1"
                placeholder="4"
                value={editFormData.guests}
                onChange={(e) => setEditFormData({ ...editFormData, guests: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Special Requests</Label>
              <Input
                placeholder="Any special requests or dietary restrictions..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleUpdateReservation} disabled={isUpdating} className="w-full sm:w-auto">
              {isUpdating && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Update Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};