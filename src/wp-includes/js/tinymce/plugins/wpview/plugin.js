/* global tinymce */
/**
 * WordPress View plugin.
 */
tinymce.PluginManager.add( 'wpview', function( editor ) {
	var VK = tinymce.util.VK,
		TreeWalker = tinymce.dom.TreeWalker,
		selected;

	function getParentView( node ) {
		while ( node ) {
			if ( isView( node ) ) {
				return node;
			}

			node = node.parentNode;
		}
	}

	function isView( node ) {
		return (/(?:^|\s)wp-view-wrap(?:\s|$)/).test( node.className );
	}

	function select( view ) {
		if ( view === selected ) {
			return;
		}

		deselect();
		selected = view;

		editor.selection.collapse();

		// select a the hidden span
		editor.selection.select( editor.dom.select( '.wp-view-shortcode textarea', view )[0] );
		wp.mce.view.select( selected );
	}

	function deselect() {
		if ( selected ) {
			wp.mce.view.deselect( selected );
		}

		selected = null;
	}

	// Check if the `wp.mce` API exists.
	if ( typeof wp === 'undefined' || ! wp.mce ) {
		return;
	}

	editor.on( 'PreInit', function() {
		// Add elements so we can set `contenteditable` to false.
		// TODO: since we are serializing, is this needed?
		editor.schema.addValidElements('div[*],span[*]');
	});

	// When the editor's content changes, scan the new content for
	// matching view patterns, and transform the matches into
	// view wrappers. Since the editor's DOM is outdated at this point,
	// we'll wait to render the views.
	editor.on( 'BeforeSetContent', function( e ) {
		if ( ! e.content ) {
			return;
		}

		e.content = wp.mce.view.toViews( e.content );
	});

	// When the editor's content has been updated and the DOM has been
	// processed, render the views in the document.
	editor.on( 'SetContent', function() {
		wp.mce.view.render( editor.getDoc() );
	});

	// Provide our own handler for selecting a view that is picked up before TinyMCE
	// Ideally, TinyMCE would provide a way to relinquish control over a block that is marked contenteditable=false perhaps through some sort of data attribute
	editor.on( 'mousedown', function( event ) {
		var view = getParentView( event.target );

		if ( event.metaKey || event.ctrlKey ) {
			return;
		}

		// Update the selected view.
		if ( view ) {
			select( view );

			// maybe we can trigger the mousedown so that a view can listen to it.
			// Prevent the selection from propagating to other plugins.
			return false;

		} else {
			deselect();
		}
	} );


	editor.on( 'init', function() {
		var selection = editor.selection;
		// When a view is selected, ensure content that is being pasted
		// or inserted is added to a text node (instead of the view).
		editor.on( 'BeforeSetContent', function() {
			var walker, target,
				view = getParentView( selection.getNode() );

			// If the selection is not within a view, bail.
			if ( ! view ) {
				return;
			}

			// If there are no additional nodes or the next node is a
			// view, create a text node after the current view.
			if ( ! view.nextSibling || isView( view.nextSibling ) ) {
				target = editor.getDoc().createTextNode('');
				editor.dom.insertAfter( target, view );

			// Otherwise, find the next text node.
			} else {
				walker = new TreeWalker( view.nextSibling, view.nextSibling );
				target = walker.next();
			}

			// Select the `target` text node.
			selection.select( target );
			selection.collapse( true );
		});

		// When the selection's content changes, scan any new content
		// for matching views and immediately render them.
		//
		// Runs on paste and on inserting nodes/html.
		editor.on( 'SetContent', function( e ) {
			if ( ! e.context ) {
				return;
			}

			var node = selection.getNode();

			if ( ! node.innerHTML ) {
				return;
			}

			node.innerHTML = wp.mce.view.toViews( node.innerHTML );
			wp.mce.view.render( node );
		});
	});

	// When the editor's contents are being accessed as a string,
	// transform any views back to their text representations.
	editor.on( 'PostProcess', function( e ) {
		if ( ( ! e.get && ! e.save ) || ! e.content ) {
			return;
		}

		e.content = wp.mce.view.toText( e.content );
	});

	editor.on( 'keydown', function( event ) {
		var keyCode = event.keyCode,
			view, instance;

		// If a view isn't selected, let the event go on its merry way.
		if ( ! selected ) {
			return;
		}

		// Let keypresses that involve the command or control keys through.
		// Also, let any of the F# keys through.
		if ( event.metaKey || event.ctrlKey || ( keyCode >= 112 && keyCode <= 123 ) ) {
			return;
		}

		// If the caret is not within the selected view, deselect the
		// view and bail.
		view = getParentView( editor.selection.getNode() );
		if ( view !== selected ) {
			deselect();
			return;
		}

		// If delete or backspace is pressed, delete the view.
		if ( keyCode === VK.DELETE || keyCode === VK.BACKSPACE ) {
			if ( (instance = wp.mce.view.instance( selected )) ) {
				instance.remove();
				deselect();
			}
		}


		event.preventDefault();
	});
});
