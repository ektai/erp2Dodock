frappe.ui.form.on('Report', {
	refresh: function(frm) {
		if (frm.doc.is_standard === "Yes" && !frappe.boot.developer_mode) {
			// make the document read-only
			frm.set_read_only();
		}

		let doc = frm.doc;
		frm.add_custom_button(__("Show Report"), function() {
			switch(doc.report_type) {
				case "Report Builder":
					frappe.set_route('List', doc.ref_doctype, 'Report', doc.name);
					break;
				case "Query Report":
					frappe.set_route("query-report", doc.name);
					break;
				case "Script Report":
					frappe.set_route("query-report", doc.name);
					break;
				case "Custom Report":
					frappe.set_route("query-report", doc.name);
					break;
			}
		}, "uil uil-table");

		if (doc.is_standard === "Yes") {
			frm.add_custom_button(doc.disabled ? __("Enable Report") : __("Disable Report"), function() {
				frm.call('toggle_disable', {
					disable: doc.disabled ? 0 : 1
				}).then(() => {
					frm.reload_doc();
				});
			}, doc.disabled ? "uil uil-check" : "uil uil-times");
		}

		frm.events.report_type(frm);
	},

	ref_doctype: function(frm) {
		if(frm.doc.ref_doctype) {
			frm.trigger("set_doctype_roles");
		}
	},

	set_doctype_roles: function(frm) {
		return frm.call('set_doctype_roles').then(() => {
			frm.refresh_field('roles');
		});
	}
})
