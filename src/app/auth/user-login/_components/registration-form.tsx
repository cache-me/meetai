import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  registrationInput,
  RegistrationInput,
} from "@/server/api/router/user/user.input";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
  FormControl,
} from "@/components/ui/form";
import { trpc } from "@/client/trpc/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User2 } from "lucide-react";

type RegistrationFormProps = {
  onSuccess: () => void;
};

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const { toast } = useToast();
  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationInput),
    defaultValues: {
      email: "",
      name: "",
      mobileNumber: "",
      gender: "MALE",
      address: "",
    },
  });

  const formSubmit = (values: z.infer<typeof registrationInput>) => {
    createNewMember.mutate(values);
  };

  const createNewMember = trpc.user.register.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member registered successfully",
        variant: "success",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center justify-center sm:px-6">
      <div className="w-full max-w-md">
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-2xl font-bold">Create your account</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Join us today and explore all our features
            </div>
          </div>
        </div>

        <div>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((value) => {
                formSubmit(value);
              })}
            >
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <Input
                        placeholder="Enter your full name"
                        className="h-12 w-full"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <Input
                        placeholder="you@example.com"
                        className="h-12 w-full"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <Input
                        placeholder="Enter your phone number"
                        className="h-12 w-full"
                        {...field}
                        maxLength={10}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <Input
                        placeholder="Your Address"
                        className="h-12 w-full"
                        {...field}
                      ></Input>
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex space-x-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="MALE" />
                            </FormControl>
                            <FormLabel className="text-muted-foreground">
                              Male
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="FEMALE" />
                            </FormControl>
                            <FormLabel className="text-muted-foreground">
                              Female
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="OTHER" />
                            </FormControl>
                            <FormLabel className="text-muted-foreground">
                              Other
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="PREFER_NOT_TO_SAY" />
                            </FormControl>
                            <FormLabel className="text-muted-foreground">
                              Prefer not to say
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                icon={<User2 className="h-4 w-4" />}
                loading={createNewMember.isPending}
                disabled={createNewMember.isPending}
              >
                Sign up
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
